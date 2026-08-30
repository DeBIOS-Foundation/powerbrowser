# Residual-brand scan report

- Inventory: `inventory/brand-tokens.json`
- Scope: whole tree (`git ls-files` minus `scope.exclude` minus binary extensions)
- Files scanned: 102
- Inventory rows in scope: 42
- Verdict: **RED — renameable occurrences remain**

## Reconciliation conditions asserted

- condition 1: every inventoried token with expected_count > 0 was found
- condition 2: each token's observed count EQUALS its expected count
- condition 3: every observed file appears in that token's expected_files
- condition 4: no occurrence was found that the inventory does not account for (independent case-insensitive probe, no boundary rule)
- ground truth: observed + already-renamed + not-imported EQUALS 01-RESEARCH.md's independently measured census (928 + 57 + 17 = 1002, expected 1002)

All asserted conditions hold.

## Ground-truth reconciliation

Source: `01-RESEARCH.md, "Token Inventory Ground Truth -> Occurrence counts by migration disposition", measured over `git ls-files` at sourcerer@bce68bb468e4dc160da8c9e238e030a400b806f8 with a clean working tree`. Counted the same way that census was counted — plain case-sensitive substring over the scanned scope, no boundary rule and no inventory rows — so this is a cross-check against a number produced by a different tool on a different tree, not this scanner agreeing with itself.

| accounting line | occurrences |
|---|---:|
| observed now: `sourcerer` | 392 |
| observed now: `Sourcerer` | 311 |
| observed now: `SOURCERER` | 225 |
| **observed now, total** | **928** |
| already renamed: the `chrome-package` coupled chain, renamed by the tracer in plan 01-01 before this report was produced | 57 |
| not imported: `CLAUDE.md` | 12 |
| not imported: `.claude/CLAUDE.md` | 5 |
| **accounted for** | **1002** |
| researched migrating scope | 755 |
| researched phase-verifier drivers (D-21, migrated now, consolidated later) | 247 |
| **researched total** | **1002** |

**The arithmetic closes exactly: 1002 = 1002.** Nothing is absorbed.

## Offenses — occurrences that must be renamed (933)

One row per occurrence, as `path:line:token`, sorted by path then line.

```
.mozconfig:1:SOURCERER
.mozconfig:6:--with-app-basename=Sourcerer
.mozconfig:7:deocracy
.mozconfig:10:SOURCERER
.mozconfig:10:sourcerer
.mozconfig:11:sourcerer
docs/BUILD.md:1:Sourcerer
docs/BUILD.md:4:Sourcerer
docs/BUILD.md:21:sourcerer
docs/BUILD.md:124:Sourcerer
docs/BUILD.md:126:sourcerer
docs/BUILD.md:260:010-sourcerer-identity.patch
docs/BUILD.md:269:SOURCERER
docs/BUILD.md:269:SOURCERER
docs/BUILD.md:269:sourcerer
docs/BUILD.md:283:010-sourcerer-identity.patch
docs/BUILD.md:296:Sourcerer
docs/BUILD.md:321:010-sourcerer-identity.patch
docs/BUILD.md:324:sourcerer
docs/BUILD.md:327:sourcerer
docs/BUILD.md:327:SourcererAPI
docs/BUILD.md:332:sourcerer
docs/BUILD.md:352:sourcerer
docs/BUILD.md:386:sourcerer
docs/BUILD.md:393:Sourcerer
docs/BUILD.md:399:Sourcerer
docs/BUILD.md:400:Sourcerer
docs/BUILD.md:406:sourcerer
docs/BUILD.md:426:SOURCERER
docs/BUILD.md:449:sourcerer
docs/BUILD.md:450:sourcerer
docs/BUILD.md:466:sourcerer
docs/BUILD.md:466:sourcerer
docs/BUILD.md:467:sourcerer
docs/BUILD.md:467:sourcerer
docs/BUILD.md:471:sourcerer
docs/BUILD.md:472:sourcerer
docs/CUSTOMIZE.md:1:Sourcerer
docs/CUSTOMIZE.md:3:Sourcerer
docs/CUSTOMIZE.md:11:Sourcerer
docs/CUSTOMIZE.md:12:Sourcerer
docs/CUSTOMIZE.md:32:Sourcerer
docs/CUSTOMIZE.md:41:sourcerer
docs/CUSTOMIZE.md:71:Sourcerer
docs/CUSTOMIZE.md:88:Sourcerer
docs/URI-SCHEMES.md:3:Sourcerer
flake.nix:2:Sourcerer
flake.nix:44:Sourcerer
flake.nix:86:Sourcerer
LICENSE:133:Deocracy
LICENSE:133:Sourcerer
patches/010-sourcerer-identity.patch:20:Deocracy
README.md:1:Sourcerer
README.md:3:Sourcerer
README.md:5:Sourcerer
README.md:12:sourcerer
README.md:12:sourcerer
README.md:21:sourcerer
README.md:51:Sourcerer
scripts/apply-patches.sh:14:010-sourcerer-identity.patch
scripts/apply-patches.sh:71:010-sourcerer-identity.patch
scripts/fetch-upstream.sh:114:sourcerer
scripts/fetch-upstream.sh:114:sourcerer
scripts/fetch-upstream.sh:116:sourcerer
scripts/fetch-upstream.sh:117:sourcerer
scripts/fetch-upstream.sh:119:sourcerer
scripts/lib/firefox-bidi.mjs:33:Sourcerer
scripts/lib/firefox-bidi.mjs:39:sourcerer
scripts/lib/firefox-bidi.mjs:181:sourcerer
scripts/lib/firefox-bidi.mjs:262:sourcerer
scripts/rebase-upstream.sh:67:sourcerer
scripts/rebase-upstream.sh:67:sourcerer
scripts/rebase-upstream.sh:98:sourcerer
scripts/rebase-upstream.sh:99:sourcerer
scripts/rebase-upstream.sh:100:sourcerer
scripts/rebase-upstream.sh:100:sourcerer
scripts/smoke-theia.sh:96:sourcerer
scripts/smoke-theia.sh:97:SOURCERER_TOKEN
scripts/smoke-theia.sh:98:Sourcerer
scripts/smoke-theia.sh:99:SOURCERER_TOKEN_DISABLE
scripts/verify-branding-identity.mjs:12:sourcerer
scripts/verify-branding-identity.mjs:17:SOURCERER_APP_IDENTITY
scripts/verify-branding-identity.mjs:31:{"name":"Sourcerer","vendor":"Deocracy"
scripts/verify-branding-identity.mjs:42:sourcerer
scripts/verify-branding-identity.mjs:68:sourcerer
scripts/verify-branding-identity.mjs:68:sourcerer
scripts/verify-branding-identity.mjs:128:sourcerer
scripts/verify-branding-identity.mjs:129:sourcerer
scripts/verify-branding-identity.mjs:129:sourcerer
scripts/verify-branding-identity.mjs:131:sourcerer
scripts/verify-branding-identity.mjs:132:sourcerer
scripts/verify-branding-identity.mjs:133:Sourcerer
scripts/verify-branding-identity.mjs:136:sourcerer
scripts/verify-branding-identity.mjs:137:sourcerer
scripts/verify-branding-identity.mjs:137:sourcerer
scripts/verify-branding-identity.mjs:139:sourcerer
scripts/verify-branding-identity.mjs:140:sourcerer
scripts/verify-branding-identity.mjs:141:Sourcerer
scripts/verify-branding-identity.mjs:315:sourcerer
scripts/verify-branding-identity.mjs:315:sourcerer
scripts/verify-branding-identity.mjs:318:sourcerer
scripts/verify-branding-identity.mjs:319:sourcerer
scripts/verify-branding-identity.mjs:321:sourcerer
scripts/verify-branding-identity.mjs:321:sourcerer
scripts/verify-branding-identity.mjs:323:sourcerer
scripts/verify-branding-identity.mjs:327:sourcerer
scripts/verify-branding-identity.mjs:331:sourcerer
scripts/verify-branding-identity.mjs:331:sourcerer
scripts/verify-branding-identity.mjs:337:stockControl ? 'Firefox' : 'Sourcerer'
scripts/verify-branding-identity.mjs:338:Deocracy
scripts/verify-branding-identity.mjs:347:SourcererAPI
scripts/verify-branding-identity.mjs:347:SOURCERER_APP_IDENTITY
scripts/verify-branding-identity.mjs:350:SOURCERER_APP_IDENTITY
scripts/verify-branding-identity.mjs:351:sourcerer
scripts/verify-branding-identity.mjs:353:SourcererAPI
scripts/verify-branding-identity.mjs:360:sourcerer
scripts/verify-branding-identity.mjs:369:SOURCERER_APP_IDENTITY
scripts/verify-branding-identity.mjs:391:SOURCERER_APP_IDENTITY
scripts/verify-branding-identity.mjs:398:sourcerer
scripts/verify-branding-identity.mjs:398:SOURCERER_APP_IDENTITY
scripts/verify-branding-identity.mjs:452:SOURCERER_APP_IDENTITY
scripts/verify-branding.mjs:4:sourcerer
scripts/verify-branding.mjs:6:Sourcerer
scripts/verify-branding.mjs:6:Sourcerer
scripts/verify-branding.mjs:60:Sourcerer
scripts/verify-branding.mjs:68:Sourcerer
scripts/verify-branding.mjs:84:Sourcerer
scripts/verify-branding.mjs:85:Sourcerer
scripts/verify-branding.mjs:104:Sourcerer
scripts/verify-branding.mjs:152:Sourcerer
scripts/verify-branding.mjs:153:Sourcerer
scripts/verify-branding.mjs:169:sourcerer
scripts/verify-branding.mjs:169:sourcerer
scripts/verify-branding.mjs:170:sourcerer
scripts/verify-branding.mjs:171:sourcerer
scripts/verify-branding.mjs:171:sourcerer
scripts/verify-branding.mjs:180:sourcerer
scripts/verify-customize-inert.mjs:61:sourcerer
scripts/verify-dev-flag-off.mjs:5:SourcererPrivilegedJs
scripts/verify-dev-flag-off.mjs:20:SourcererPrivilegedJs
scripts/verify-dev-flag-off.mjs:32:sourcerer
scripts/verify-dev-flag-off.mjs:49:SourcererPrivilegedJs
scripts/verify-dev-flag-off.mjs:68:SourcererPrivilegedJs
scripts/verify-dev-flag-off.mjs:85:SourcererPrivilegedJs
scripts/verify-dev-flag-off.mjs:92:SourcererPrivilegedJs
scripts/verify-endpoints.sh:11:sourcerer
scripts/verify-endpoints.sh:47:sourcerer
scripts/verify-endpoints.sh:48:sourcerer
scripts/verify-endpoints.sh:300:deocracy
scripts/verify-endpoints.sh:300:sourcerer
scripts/verify-endpoints.sh:381:sourcerer
scripts/verify-phase-02.sh:63:sourcerer
scripts/verify-phase-02.sh:64:SOURCERER_TOKEN
scripts/verify-phase-02.sh:66:Sourcerer
scripts/verify-phase-02.sh:67:SOURCERER_TOKEN_DISABLE
scripts/verify-phase-03.sh:26:sourcerer
scripts/verify-phase-03.sh:85:sourcerer
scripts/verify-phase-03.sh:85:sourcerer
scripts/verify-phase-03.sh:148:sourcerer
scripts/verify-phase-03.sh:219:sourcerer
scripts/verify-phase-03.sh:230:sourcerer
scripts/verify-phase-03.sh:240:sourcerer
scripts/verify-phase-03.sh:259:sourcerer
scripts/verify-phase-03.sh:275:Sourcerer
scripts/verify-phase-03.sh:276:Sourcerer
scripts/verify-phase-03.sh:350:Sourcerer
scripts/verify-phase-03.sh:351:Sourcerer
scripts/verify-phase-03.sh:353:Sourcerer
scripts/verify-phase-03.sh:354:Sourcerer
scripts/verify-phase-03.sh:374:sourcerer
scripts/verify-phase-03.sh:399:Sourcerer
scripts/verify-phase-03.sh:400:Sourcerer
scripts/verify-phase-03.sh:414:Sourcerer
scripts/verify-phase-03.sh:482:sourcerer
scripts/verify-phase-04.sh:18:sourcerer
scripts/verify-phase-04.sh:21:SourcererAPI
scripts/verify-phase-04.sh:22:sourcerer
scripts/verify-phase-04.sh:53:sourcerer
scripts/verify-phase-04.sh:106:sourcerer
scripts/verify-phase-04.sh:107:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:127:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:139:sourcerer
scripts/verify-phase-04.sh:143:Sourcerer
scripts/verify-phase-04.sh:144:SOURCERER_SUPERVISED
scripts/verify-phase-04.sh:149:SOURCERER_SUPERVISED
scripts/verify-phase-04.sh:149:SOURCERER_TOKEN_DISABLE
scripts/verify-phase-04.sh:150:SOURCERER_TOKEN
scripts/verify-phase-04.sh:161:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:162:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:170:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:177:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:202:sourcerer
scripts/verify-phase-04.sh:227:SOURCERER_TOKEN
scripts/verify-phase-04.sh:227:sourcerer
scripts/verify-phase-04.sh:258:SOURCERER_TOKEN
scripts/verify-phase-04.sh:302:sourcerer
scripts/verify-phase-04.sh:305:SOURCERER
scripts/verify-phase-04.sh:305:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:305:SOURCERER
scripts/verify-phase-04.sh:324:sourcerer
scripts/verify-phase-04.sh:350:SourcererAPI
scripts/verify-phase-04.sh:351:SourcererAPI
scripts/verify-phase-04.sh:353:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:357:SourcererAPI
scripts/verify-phase-04.sh:360:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:361:SourcererAPI
scripts/verify-phase-04.sh:364:SourcererAPI
scripts/verify-phase-04.sh:365:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:366:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:372:SourcererAPI
scripts/verify-phase-04.sh:373:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:374:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:390:SOURCERER
scripts/verify-phase-04.sh:400:SOURCERER
scripts/verify-phase-04.sh:401:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:402:SOURCERER
scripts/verify-phase-04.sh:405:SOURCERER
scripts/verify-phase-04.sh:405:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:405:SOURCERER
scripts/verify-phase-04.sh:410:SOURCERER
scripts/verify-phase-04.sh:410:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:414:SOURCERER
scripts/verify-phase-04.sh:426:sourcerer
scripts/verify-phase-04.sh:429:SOURCERER
scripts/verify-phase-04.sh:435:SourcererAPI
scripts/verify-phase-04.sh:435:SOURCERER
scripts/verify-phase-04.sh:437:SOURCERER
scripts/verify-phase-04.sh:476:SOURCERER
scripts/verify-phase-04.sh:478:SOURCERER
scripts/verify-phase-04.sh:485:SOURCERER
scripts/verify-phase-04.sh:486:SOURCERER
scripts/verify-phase-04.sh:493:SourcererAPI
scripts/verify-phase-04.sh:495:SourcererAPI
scripts/verify-phase-04.sh:495:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:495:SourcererAPI
scripts/verify-phase-04.sh:497:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:501:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:504:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:510:sourcerer
scripts/verify-phase-04.sh:512:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:520:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:544:SOURCERER_BACKEND_READY
scripts/verify-phase-04.sh:570:sourcerer
scripts/verify-phase-04.sh:570:sourcerer
scripts/verify-phase-04.sh:580:sourcerer
scripts/verify-phase-04.sh:580:sourcerer
scripts/verify-phase-05.sh:18:sourcerer
scripts/verify-phase-05.sh:76:sourcerer
scripts/verify-phase-05.sh:139:sourcerer
scripts/verify-phase-05.sh:173:SourcererAPI
scripts/verify-phase-05.sh:174:SourcererAPI
scripts/verify-phase-05.sh:177:SourcererAPI
scripts/verify-phase-05.sh:181:SourcererAPI
scripts/verify-phase-05.sh:184:SourcererAPI
scripts/verify-phase-05.sh:187:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:190:SourcererAPI
scripts/verify-phase-05.sh:191:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:192:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:203:SourcererAPI
scripts/verify-phase-05.sh:208:Sourcerer
scripts/verify-phase-05.sh:305:sourcerer
scripts/verify-phase-05.sh:336:SOURCERER
scripts/verify-phase-05.sh:352:SOURCERER
scripts/verify-phase-05.sh:354:SOURCERER
scripts/verify-phase-05.sh:361:SOURCERER
scripts/verify-phase-05.sh:379:SourcererAPI
scripts/verify-phase-05.sh:417:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:419:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:426:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:427:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:436:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:493:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:503:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:506:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:506:SOURCERER_TOKEN_DISABLE
scripts/verify-phase-05.sh:507:SOURCERER_TOKEN
scripts/verify-phase-05.sh:543:sourcerer
scripts/verify-phase-05.sh:588:sourcerer
scripts/verify-phase-05.sh:695:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:731:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:737:sourcerer
scripts/verify-phase-05.sh:737:sourcerer
scripts/verify-phase-05.sh:751:SOURCERER
scripts/verify-phase-05.sh:761:SOURCERER
scripts/verify-phase-05.sh:762:SOURCERER
scripts/verify-phase-05.sh:768:SOURCERER
scripts/verify-phase-05.sh:795:sourcerer
scripts/verify-phase-05.sh:796:sourcerer
scripts/verify-phase-05.sh:810:SOURCERER
scripts/verify-phase-05.sh:820:SOURCERER
scripts/verify-phase-05.sh:821:SOURCERER
scripts/verify-phase-05.sh:828:SourcererAPI
scripts/verify-phase-05.sh:830:SourcererAPI
scripts/verify-phase-05.sh:844:SOURCERER
scripts/verify-phase-05.sh:846:SOURCERER
scripts/verify-phase-05.sh:852:SOURCERER
scripts/verify-phase-05.sh:853:SOURCERER
scripts/verify-phase-05.sh:856:SOURCERER
scripts/verify-phase-05.sh:856:SOURCERER_TOKEN
scripts/verify-phase-05.sh:867:SourcererAPI
scripts/verify-phase-05.sh:867:SOURCERER
scripts/verify-phase-05.sh:869:SOURCERER
scripts/verify-phase-05.sh:914:sourcerer
scripts/verify-phase-05.sh:915:sourcerer
scripts/verify-phase-05.sh:916:sourcerer
scripts/verify-phase-05.sh:917:sourcerer
scripts/verify-phase-05.sh:931:SOURCERER
scripts/verify-phase-05.sh:941:SOURCERER
scripts/verify-phase-05.sh:942:SOURCERER
scripts/verify-phase-05.sh:948:SOURCERER
scripts/verify-phase-05.sh:958:SOURCERER
scripts/verify-phase-05.sh:979:SOURCERER_APP_IDENTITY
scripts/verify-phase-05.sh:985:sourcerer
scripts/verify-phase-05.sh:986:sourcerer
scripts/verify-phase-05.sh:994:sourcerer
scripts/verify-phase-05.sh:998:SOURCERER
scripts/verify-phase-05.sh:1006:sourcerer
scripts/verify-phase-05.sh:1006:sourcerer
scripts/verify-phase-05.sh:1020:SOURCERER
scripts/verify-phase-05.sh:1030:SOURCERER
scripts/verify-phase-05.sh:1031:SOURCERER
scripts/verify-phase-05.sh:1040:SourcererAPI
scripts/verify-phase-05.sh:1040:SOURCERER
scripts/verify-phase-05.sh:1048:SourcererAPI
scripts/verify-phase-05.sh:1048:SOURCERER_APP_IDENTITY
scripts/verify-phase-05.sh:1048:SourcererAPI
scripts/verify-phase-05.sh:1048:SOURCERER_APP_IDENTITY
scripts/verify-phase-05.sh:1050:SOURCERER_APP_IDENTITY
scripts/verify-phase-05.sh:1064:SOURCERER_APP_IDENTITY
scripts/verify-phase-05.sh:1072:sourcerer
scripts/verify-phase-05.sh:1072:sourcerer
scripts/verify-phase-05.sh:1073:sourcerer
scripts/verify-phase-05.sh:1074:sourcerer
scripts/verify-phase-05.sh:1074:sourcerer
scripts/verify-phase-05.sh:1076:sourcerer
scripts/verify-phase-05.sh:1077:sourcerer
scripts/verify-phase-05.sh:1081:SOURCERER
scripts/verify-phase-05.sh:1095:sourcerer
scripts/verify-phase-05.sh:1098:SourcererAPI
scripts/verify-phase-05.sh:1110:sourcerer
scripts/verify-phase-05.sh:1187:SOURCERER
scripts/verify-phase-05.sh:1194:sourcerer
scripts/verify-phase-05.sh:1215:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1217:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1224:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1225:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1256:SOURCERER
scripts/verify-phase-05.sh:1258:SOURCERER
scripts/verify-phase-05.sh:1271:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1279:sourcerer
scripts/verify-phase-05.sh:1300:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1302:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1309:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1310:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1319:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1338:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1352:Sourcerer
scripts/verify-phase-05.sh:1380:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1382:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1389:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1424:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1460:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1470:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1505:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1515:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1521:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1567:sourcerer
scripts/verify-phase-05.sh:1598:sourcerer
scripts/verify-phase-05.sh:1618:sourcerer
scripts/verify-phase-05.sh:1619:sourcerer
scripts/verify-phase-05.sh:1627:sourcerer
scripts/verify-phase-05.sh:1643:sourcerer
scripts/verify-phase-05.sh:1644:sourcerer
scripts/verify-phase-05.sh:1644:sourcerer
scripts/verify-phase-05.sh:1645:sourcerer
scripts/verify-phase-05.sh:1645:Sourcerer
scripts/verify-phase-05.sh:1675:sourcerer
scripts/verify-phase-05.sh:1698:SourcererAPI
scripts/verify-phase-05.sh:1698:sourcerer
scripts/verify-phase-05.sh:1699:SOURCERER_TOKEN
scripts/verify-phase-05.sh:1700:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:1706:sourcerer
scripts/verify-phase-05.sh:1707:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:1732:SOURCERER
scripts/verify-phase-05.sh:1734:sourcerer
scripts/verify-phase-05.sh:1738:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:1763:SOURCERER_BACKEND_READY
scripts/verify-phase-05.sh:1772:sourcerer
scripts/verify-phase-05.sh:1775:SOURCERER
scripts/verify-phase-05.sh:1783:SOURCERER
scripts/verify-phase-05.sh:1797:SOURCERER_TOKEN
scripts/verify-phase-05.sh:1798:SOURCERER_TOKEN
scripts/verify-phase-05.sh:1798:SourcererAPI
scripts/verify-phase-05.sh:1827:SOURCERER_TOKEN
scripts/verify-phase-05.sh:1828:SOURCERER_TOKEN_DISABLE
scripts/verify-phase-05.sh:1829:SOURCERER_TOKEN
scripts/verify-phase-05.sh:1829:SOURCERER_SUPERVISED
scripts/verify-phase-05.sh:1829:SOURCERER_TOKEN_DISABLE
scripts/verify-uri-roundtrip.mjs:74:sourcerer
sourcerer/branding/dev/configure.sh:5:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.ftl:5:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.ftl:6:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.ftl:7:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.ftl:8:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.ftl:11:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.ftl:15:Deocracy
sourcerer/branding/dev/locales/en-US/brand.properties:5:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.properties:6:Sourcerer
sourcerer/branding/dev/locales/en-US/brand.properties:7:Sourcerer
sourcerer/branding/dev/pref/firefox-branding.js:6:sourcerer
sourcerer/branding/dev/pref/firefox-branding.js:14:sourcerer
sourcerer/branding/dev/pref/firefox-branding.js:73:sourcerer
sourcerer/branding/dev/pref/firefox-branding.js:119:sourcerer
sourcerer/branding/dev/pref/firefox-branding.js:120:SOURCERER
sourcerer/branding/dev/pref/firefox-branding.js:169:sourcerer
sourcerer/branding/release/configure.sh:5:Sourcerer
sourcerer/branding/release/locales/en-US/brand.ftl:5:Sourcerer
sourcerer/branding/release/locales/en-US/brand.ftl:6:Sourcerer
sourcerer/branding/release/locales/en-US/brand.ftl:7:Sourcerer
sourcerer/branding/release/locales/en-US/brand.ftl:8:Sourcerer
sourcerer/branding/release/locales/en-US/brand.ftl:11:Sourcerer
sourcerer/branding/release/locales/en-US/brand.ftl:15:Deocracy
sourcerer/branding/release/locales/en-US/brand.properties:5:Sourcerer
sourcerer/branding/release/locales/en-US/brand.properties:6:Sourcerer
sourcerer/branding/release/locales/en-US/brand.properties:7:Sourcerer
sourcerer/branding/release/pref/firefox-branding.js:6:sourcerer
sourcerer/branding/release/pref/firefox-branding.js:14:sourcerer
sourcerer/branding/release/pref/firefox-branding.js:73:sourcerer
sourcerer/branding/release/pref/firefox-branding.js:119:sourcerer
sourcerer/branding/release/pref/firefox-branding.js:120:SOURCERER
sourcerer/endpoint-allowlist.json:42:sourcerer
sourcerer/endpoint-allowlist.json:52:sourcerer
sourcerer/endpoint-allowlist.json:77:sourcerer
sourcerer/endpoint-allowlist.json:82:sourcerer
sourcerer/endpoint-allowlist.json:82:SOURCERER
sourcerer/endpoint-allowlist.json:82:Deocracy
sourcerer/endpoint-allowlist.json:82:Sourcerer
sourcerer/endpoint-allowlist.json:249:sourcerer
sourcerer/INTERNAL-APIS.md:3:sourcerer
sourcerer/INTERNAL-APIS.md:3:SourcererAPI
sourcerer/INTERNAL-APIS.md:4:sourcerer
sourcerer/INTERNAL-APIS.md:9:SourcererAPI
sourcerer/INTERNAL-APIS.md:16:sourcerer
sourcerer/INTERNAL-APIS.md:20:SourcererAPI
sourcerer/INTERNAL-APIS.md:22:SourcererAPI
sourcerer/INTERNAL-APIS.md:23:SourcererAPI
sourcerer/INTERNAL-APIS.md:23:SourcererAPI
sourcerer/INTERNAL-APIS.md:24:SourcererAPI
sourcerer/INTERNAL-APIS.md:25:SourcererAPI
sourcerer/INTERNAL-APIS.md:26:SourcererAPI
sourcerer/INTERNAL-APIS.md:27:SourcererAPI
sourcerer/INTERNAL-APIS.md:27:Sourcerer
sourcerer/INTERNAL-APIS.md:28:SourcererAPI
sourcerer/INTERNAL-APIS.md:28:SourcererAPI
sourcerer/INTERNAL-APIS.md:29:SourcererAPI
sourcerer/INTERNAL-APIS.md:29:SourcererAPI
sourcerer/INTERNAL-APIS.md:30:SourcererAPI
sourcerer/INTERNAL-APIS.md:30:SOURCERER_TOKEN
sourcerer/INTERNAL-APIS.md:31:SourcererAPI
sourcerer/INTERNAL-APIS.md:31:sourcerer
sourcerer/INTERNAL-APIS.md:31:SourcererAPI
sourcerer/INTERNAL-APIS.md:32:SourcererAPI
sourcerer/INTERNAL-APIS.md:32:SourcererAPI
sourcerer/INTERNAL-APIS.md:33:SourcererAPI
sourcerer/INTERNAL-APIS.md:33:SourcererAPI
sourcerer/INTERNAL-APIS.md:34:SourcererAPI
sourcerer/INTERNAL-APIS.md:35:SourcererAPI
sourcerer/INTERNAL-APIS.md:35:SourcererAPI
sourcerer/INTERNAL-APIS.md:36:SourcererAPI
sourcerer/INTERNAL-APIS.md:37:SourcererAPI
sourcerer/INTERNAL-APIS.md:37:SourcererAPI
sourcerer/INTERNAL-APIS.md:38:SourcererAPI
sourcerer/INTERNAL-APIS.md:38:Sourcerer
sourcerer/INTERNAL-APIS.md:39:SourcererAPI
sourcerer/INTERNAL-APIS.md:39:SourcererAPI
sourcerer/INTERNAL-APIS.md:40:SourcererAPI
sourcerer/INTERNAL-APIS.md:40:sourcerer
sourcerer/INTERNAL-APIS.md:41:SourcererAPI
sourcerer/INTERNAL-APIS.md:41:SourcererAPI
sourcerer/INTERNAL-APIS.md:42:SourcererAPI
sourcerer/INTERNAL-APIS.md:42:sourcerer
sourcerer/INTERNAL-APIS.md:42:sourcerer
sourcerer/INTERNAL-APIS.md:43:SourcererAPI
sourcerer/INTERNAL-APIS.md:43:Sourcerer
sourcerer/INTERNAL-APIS.md:43:sourcerer
sourcerer/INTERNAL-APIS.md:43:SourcererAPI
sourcerer/INTERNAL-APIS.md:43:SourcererAPI
sourcerer/INTERNAL-APIS.md:56:SourcererAPI
sourcerer/shell/sourcerer-sidecar.js:10:SOURCERER_DEV_TREE
sourcerer/shell/sourcerer-sidecar.js:12:sourcerer
sourcerer/shell/sourcerer-sidecar.js:12:SOURCERER_DEV_TREE
sourcerer/shell/sourcerer-sidecar.js:16:sourcerer
sourcerer/shell/sourcerer-sidecar.js:18:sourcerer
sourcerer/shell/sourcerer-sidecar.js:18:SOURCERER_DEV_TREE
sourcerer/shell/sourcerer-sidecar.js:20:sourcerer
sourcerer/shell/sourcerer-sidecar.js:21:sourcerer
sourcerer/shell/sourcerer-sidecar.js:22:sourcerer
sourcerer/shell/sourcerer-sidecar.js:23:sourcerer
sourcerer/shell/sourcerer-sidecar.js:24:sourcerer
sourcerer/shell/sourcerer-sidecar.js:25:sourcerer
sourcerer/shell/sourcerer-sidecar.js:34:sourcerer
sourcerer/shell/sourcerer-sidecar.js:35:sourcerer
sourcerer/shell/sourcerer-sidecar.js:39:sourcerer
sourcerer/shell/sourcerer-sidecar.js:41:sourcerer
sourcerer/shell/sourcerer-sidecar.js:41:SOURCERER
sourcerer/shell/sourcerer-sidecar.js:41:SOURCERER
sourcerer/shell/sourcerer.css:7:sourcerer
sourcerer/shell/sourcerer.css:20:sourcerer
sourcerer/shell/sourcerer.css:20:sourcerer
sourcerer/shell/sourcerer.css:24:sourcerer
sourcerer/shell/sourcerer.css:26:sourcerer
sourcerer/shell/sourcerer.css:39:sourcerer
sourcerer/shell/sourcerer.css:53:sourcerer
sourcerer/shell/sourcerer.css:57:sourcerer
sourcerer/shell/sourcerer.css:60:sourcerer
sourcerer/shell/sourcerer.css:66:sourcerer
sourcerer/shell/sourcerer.css:80:sourcerer
sourcerer/shell/sourcerer.css:86:sourcerer
sourcerer/shell/sourcerer.css:91:sourcerer
sourcerer/shell/sourcerer.css:92:sourcerer
sourcerer/shell/sourcerer.css:103:sourcerer
sourcerer/shell/sourcerer.css:104:sourcerer
sourcerer/shell/sourcerer.css:110:sourcerer
sourcerer/shell/sourcerer.css:110:sourcerer
sourcerer/shell/sourcerer.css:117:sourcerer
sourcerer/shell/sourcerer.css:122:sourcerer
sourcerer/shell/sourcerer.css:135:sourcerer
sourcerer/shell/sourcerer.css:142:sourcerer
sourcerer/shell/sourcerer.css:158:sourcerer
sourcerer/shell/sourcerer.css:169:sourcerer
sourcerer/shell/sourcerer.css:173:sourcerer
sourcerer/shell/sourcerer.js:6:sourcerer
sourcerer/shell/sourcerer.js:11:SOURCERER
sourcerer/shell/sourcerer.js:20:SOURCERER
sourcerer/shell/sourcerer.js:20:sourcerer
sourcerer/shell/sourcerer.js:20:sourcerer
sourcerer/shell/sourcerer.js:22:SourcererAPI
sourcerer/shell/sourcerer.js:22:sourcerer
sourcerer/shell/sourcerer.js:22:SourcererAPI
sourcerer/shell/sourcerer.js:24:sourcerer
sourcerer/shell/sourcerer.js:25:sourcerer
sourcerer/shell/sourcerer.js:26:sourcerer
sourcerer/shell/sourcerer.js:27:sourcerer
sourcerer/shell/sourcerer.js:28:sourcerer
sourcerer/shell/sourcerer.js:29:sourcerer
sourcerer/shell/sourcerer.js:30:sourcerer
sourcerer/shell/sourcerer.js:31:sourcerer
sourcerer/shell/sourcerer.js:32:sourcerer
sourcerer/shell/sourcerer.js:33:sourcerer
sourcerer/shell/sourcerer.js:48:SOURCERER
sourcerer/shell/sourcerer.js:63:SourcererAPI
sourcerer/shell/sourcerer.js:69:SourcererAPI
sourcerer/shell/sourcerer.js:72:sourcerer
sourcerer/shell/sourcerer.js:72:sourcerer
sourcerer/shell/sourcerer.js:73:SOURCERER
sourcerer/shell/sourcerer.js:74:SourcererAPI
sourcerer/shell/sourcerer.js:79:sourcerer
sourcerer/shell/sourcerer.js:79:sourcerer
sourcerer/shell/sourcerer.js:84:sourcerer
sourcerer/shell/sourcerer.js:90:sourcerer
sourcerer/shell/sourcerer.js:90:sourcerer
sourcerer/shell/sourcerer.js:94:SOURCERER
sourcerer/shell/sourcerer.js:98:sourcerer
sourcerer/shell/sourcerer.js:98:sourcerer
sourcerer/shell/sourcerer.js:100:SOURCERER
sourcerer/shell/sourcerer.js:103:sourcerer
sourcerer/shell/sourcerer.js:103:sourcerer
sourcerer/shell/sourcerer.js:109:sourcerer
sourcerer/shell/sourcerer.js:125:sourcerer
sourcerer/shell/sourcerer.js:125:sourcerer
sourcerer/shell/sourcerer.js:128:SourcererAPI
sourcerer/shell/sourcerer.js:141:sourcerer
sourcerer/shell/sourcerer.js:148:SOURCERER
sourcerer/shell/sourcerer.js:170:SOURCERER
sourcerer/shell/sourcerer.js:173:sourcerer
sourcerer/shell/sourcerer.js:173:sourcerer
sourcerer/shell/sourcerer.js:178:sourcerer
sourcerer/shell/sourcerer.js:182:sourcerer
sourcerer/shell/sourcerer.js:185:SourcererAPI
sourcerer/shell/sourcerer.js:188:SourcererAPI
sourcerer/shell/sourcerer.js:188:sourcerer
sourcerer/shell/sourcerer.js:189:SourcererAPI
sourcerer/shell/sourcerer.js:189:sourcerer
sourcerer/shell/sourcerer.js:190:SOURCERER
sourcerer/shell/sourcerer.js:198:SOURCERER_APP_IDENTITY
sourcerer/shell/sourcerer.js:198:SourcererAPI
sourcerer/shell/sourcerer.js:203:sourcerer
sourcerer/shell/sourcerer.js:206:SourcererAPI
sourcerer/shell/sourcerer.js:216:sourcerer
sourcerer/shell/sourcerer.js:219:sourcerer
sourcerer/shell/sourcerer.js:224:sourcerer
sourcerer/shell/sourcerer.xhtml:21:sourcerer
sourcerer/shell/sourcerer.xhtml:30:Sourcerer
sourcerer/shell/sourcerer.xhtml:31:sourcerer
sourcerer/shell/sourcerer.xhtml:31:sourcerer
sourcerer/shell/sourcerer.xhtml:32:sourcerer
sourcerer/shell/sourcerer.xhtml:32:sourcerer
sourcerer/shell/sourcerer.xhtml:35:sourcerer
sourcerer/shell/sourcerer.xhtml:35:Sourcerer
sourcerer/shell/sourcerer.xhtml:36:sourcerer
sourcerer/shell/sourcerer.xhtml:37:sourcerer
sourcerer/shell/sourcerer.xhtml:38:sourcerer
sourcerer/shell/sourcerer.xhtml:39:sourcerer
sourcerer/shell/sourcerer.xhtml:40:sourcerer
sourcerer/shell/sourcerer.xhtml:43:sourcerer
sourcerer/shell/sourcerer.xhtml:44:sourcerer
sourcerer/shell/sourcerer.xhtml:45:sourcerer
sourcerer/shell/sourcerer.xhtml:46:sourcerer
sourcerer/shell/sourcerer.xhtml:48:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:7:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:11:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:31:SourcererAPI
sourcerer/shell/SourcererAPI.sys.mjs:101:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:143:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:299:SOURCERER_TOKEN
sourcerer/shell/SourcererAPI.sys.mjs:323:SourcererAPI
sourcerer/shell/SourcererAPI.sys.mjs:332:Sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:357:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:358:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:359:SourcererAPI
sourcerer/shell/SourcererAPI.sys.mjs:473:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:478:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:489:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:490:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:496:sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:509:Sourcerer
sourcerer/shell/SourcererAPI.sys.mjs:516:SourcererAPI
sourcerer/shell/SourcererAPI.sys.mjs:520:SourcererAPI
sourcerer/shell/SourcererAPI.sys.mjs:523:SourcererAPI
sourcerer/shell/SourcererAPI.sys.mjs:523:Sourcerer
sourcerer/shell/TheiaService.sys.mjs:6:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:16:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:16:sourcerer
sourcerer/shell/TheiaService.sys.mjs:16:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:18:sourcerer
sourcerer/shell/TheiaService.sys.mjs:21:sourcerer
sourcerer/shell/TheiaService.sys.mjs:78:sourcerer
sourcerer/shell/TheiaService.sys.mjs:78:SOURCERER
sourcerer/shell/TheiaService.sys.mjs:106:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:119:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:131:sourcerer
sourcerer/shell/TheiaService.sys.mjs:152:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:152:sourcerer
sourcerer/shell/TheiaService.sys.mjs:154:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:167:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:199:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:199:sourcerer
sourcerer/shell/TheiaService.sys.mjs:201:sourcerer
sourcerer/shell/TheiaService.sys.mjs:205:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:206:sourcerer
sourcerer/shell/TheiaService.sys.mjs:211:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:211:sourcerer
sourcerer/shell/TheiaService.sys.mjs:212:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:214:sourcerer
sourcerer/shell/TheiaService.sys.mjs:223:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:224:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:226:sourcerer
sourcerer/shell/TheiaService.sys.mjs:232:Sourcerer
sourcerer/shell/TheiaService.sys.mjs:249:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:263:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:268:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:273:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:280:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:293:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:304:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:306:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:307:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:327:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:332:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:365:SOURCERER
sourcerer/shell/TheiaService.sys.mjs:367:SOURCERER
sourcerer/shell/TheiaService.sys.mjs:369:sourcerer
sourcerer/shell/TheiaService.sys.mjs:371:SOURCERER
sourcerer/shell/TheiaService.sys.mjs:384:SOURCERER_SUPERVISED
sourcerer/shell/TheiaService.sys.mjs:385:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:396:SOURCERER_TOKEN_DISABLE
sourcerer/shell/TheiaService.sys.mjs:401:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:421:sourcerer
sourcerer/shell/TheiaService.sys.mjs:426:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:440:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:440:sourcerer
sourcerer/shell/TheiaService.sys.mjs:446:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:463:SOURCERER_BACKEND_READY
sourcerer/shell/TheiaService.sys.mjs:474:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:477:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:479:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:493:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:493:sourcerer
sourcerer/shell/TheiaService.sys.mjs:494:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:494:sourcerer
sourcerer/shell/TheiaService.sys.mjs:505:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:508:SOURCERER_TOKEN
sourcerer/shell/TheiaService.sys.mjs:537:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:537:sourcerer
sourcerer/shell/TheiaService.sys.mjs:538:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:543:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:543:sourcerer
sourcerer/shell/TheiaService.sys.mjs:575:sourcerer
sourcerer/shell/TheiaService.sys.mjs:610:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:610:sourcerer
sourcerer/shell/TheiaService.sys.mjs:611:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:611:sourcerer
sourcerer/shell/TheiaService.sys.mjs:649:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:674:sourcerer
sourcerer/shell/TheiaService.sys.mjs:683:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:683:sourcerer
sourcerer/shell/TheiaService.sys.mjs:684:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:725:sourcerer
sourcerer/shell/TheiaService.sys.mjs:736:sourcerer
sourcerer/shell/TheiaService.sys.mjs:742:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:742:sourcerer
sourcerer/shell/TheiaService.sys.mjs:744:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:759:SOURCERER_BACKEND_READY
sourcerer/shell/TheiaService.sys.mjs:778:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:780:SOURCERER_BACKEND_READY
sourcerer/shell/TheiaService.sys.mjs:785:SOURCERER_BACKEND_READY
sourcerer/shell/TheiaService.sys.mjs:819:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:856:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:862:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:867:sourcerer
sourcerer/shell/TheiaService.sys.mjs:875:sourcerer
sourcerer/shell/TheiaService.sys.mjs:880:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:885:sourcerer
sourcerer/shell/TheiaService.sys.mjs:891:SourcererAPI
sourcerer/shell/TheiaService.sys.mjs:891:sourcerer
sourcerer/shell/TheiaService.sys.mjs:899:SourcererAPI
sourcerer/sourcerer-release.desktop:2:Sourcerer
sourcerer/sourcerer-release.desktop:3:sourcerer
sourcerer/sourcerer-release.desktop:4:sourcerer
sourcerer/sourcerer-release.desktop:8:sourcerer
sourcerer/sourcerer.desktop:2:Sourcerer
sourcerer/sourcerer.desktop:3:sourcerer
sourcerer/sourcerer.desktop:4:sourcerer
sourcerer/sourcerer.desktop:8:sourcerer
theia/applications/browser/package.json:3:sourcerer
theia/applications/browser/package.json:13:Sourcerer
theia/applications/browser/package.json:14:sourcerer
theia/applications/browser/package.json:22:sourcerer
theia/applications/browser/package.json:23:sourcerer
theia/applications/browser/package.json:24:sourcerer
theia/applications/browser/package.json:25:sourcerer
theia/applications/browser/package.json:84:sourcerer
theia/extensions/branding/package.json:3:sourcerer
theia/extensions/branding/package.json:12:sourcerer
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:4:SOURCERER
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:4:sourcerer
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:5:SOURCERER
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:5:sourcerer
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:16:Sourcerer
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:28:Sourcerer
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:33:SOURCERER
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:34:Sourcerer
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:40:SOURCERER
theia/extensions/branding/src/browser/sourcerer-about-dialog.tsx:41:SOURCERER
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:1:sourcerer
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:1:sourcerer
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:2:sourcerer
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:5:sourcerer
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:15:Sourcerer
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:22:Sourcerer
theia/extensions/branding/src/browser/sourcerer-ai-layout-contribution.ts:38:Sourcerer
theia/extensions/branding/src/browser/sourcerer-favicon-contribution.ts:3:SOURCERER
theia/extensions/branding/src/browser/sourcerer-favicon-contribution.ts:3:sourcerer
theia/extensions/branding/src/browser/sourcerer-favicon-contribution.ts:11:Sourcerer
theia/extensions/branding/src/browser/sourcerer-favicon-contribution.ts:16:SOURCERER
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:6:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:6:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:7:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:7:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:8:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:8:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:9:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:9:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:10:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:10:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:10:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:13:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:14:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:16:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:19:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:19:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:21:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:22:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:27:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:29:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:33:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:34:sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:36:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:38:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:41:Sourcerer
theia/extensions/branding/src/browser/sourcerer-frontend-module.ts:43:Sourcerer
theia/extensions/branding/src/browser/sourcerer-mark.ts:1:Sourcerer
theia/extensions/branding/src/browser/sourcerer-mark.ts:13:SOURCERER
theia/extensions/branding/src/browser/sourcerer-mark.ts:15:SOURCERER
theia/extensions/branding/src/browser/sourcerer-mark.ts:15:SOURCERER
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:3:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:3:sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:5:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:6:sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:15:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:15:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-contribution.ts:24:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:6:SOURCERER
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:6:sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:8:sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:11:sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:13:SOURCERER
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:13:Deocracy
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:13:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:16:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:44:sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:52:SOURCERER
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:59:SOURCERER
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:60:Sourcerer
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:63:SOURCERER
theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:63:SOURCERER
theia/extensions/customize/package.json:3:sourcerer
theia/extensions/customize/package.json:7:sourcerer
theia/extensions/customize/src/browser/customize-frontend-module.ts:5:sourcerer
theia/extensions/customize/src/browser/customize-frontend-module.ts:7:SourcererPrivilegedJs
theia/extensions/customize/src/browser/customize-frontend-module.ts:7:sourcerer
theia/extensions/customize/src/browser/customize-frontend-module.ts:19:SourcererPrivilegedJs
theia/extensions/customize/src/browser/customize-frontend-module.ts:21:sourcerer
theia/extensions/customize/src/browser/customize-frontend-module.ts:22:SourcererPrivilegedJs
theia/extensions/customize/src/browser/customize-frontend-module.ts:33:sourcerer
theia/extensions/customize/src/browser/customize-frontend-module.ts:36:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:5:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:6:SourcererPrivilegedJs
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:6:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:9:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:25:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:26:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:54:SourcererPrivilegedJs
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:62:sourcerer
theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts:68:sourcerer
theia/extensions/customize/src/browser/sourcerer-privileged-js.ts:3:sourcerer
theia/extensions/customize/src/browser/sourcerer-privileged-js.ts:12:SourcererPrivilegedJs
theia/extensions/customize/src/browser/sourcerer-privileged-js.ts:12:SourcererPrivilegedJs
theia/extensions/customize/src/browser/sourcerer-privileged-js.ts:15:sourcerer
theia/extensions/customize/src/browser/sourcerer-privileged-js.ts:20:sourcerer
theia/extensions/customize/src/browser/sourcerer-privileged-js.ts:23:SourcererPrivilegedJs
theia/extensions/tab-uris/package.json:3:sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:83:Sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:107:Sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:109:sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:140:Sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:142:sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:167:sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:217:sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:219:Sourcerer
theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:220:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:12:SOURCERER
theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:18:sourcerer
theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:63:SOURCERER
theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:66:sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:9:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:9:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:11:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:11:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:24:sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:40:sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:51:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:53:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:59:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:61:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:63:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:74:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:75:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:79:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:80:Sourcerer
theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:85:sourcerer
theia/extensions/tab-uris/src/browser/terminal-naming-contribution.ts:40:Sourcerer
theia/extensions/tab-uris/src/browser/terminal-naming-contribution.ts:99:Sourcerer
theia/extensions/tab-uris/src/browser/terminal-open-handler.ts:32:sourcerer
theia/extensions/tab-uris/src/browser/terminal-open-handler.ts:59:Sourcerer
theia/extensions/tab-uris/src/browser/view-factory-table.ts:33:SOURCERER
theia/extensions/tab-uris/src/browser/view-factory-table.ts:54:sourcerer
theia/extensions/tab-uris/src/browser/view-factory-table.ts:54:sourcerer
theia/extensions/tab-uris/src/browser/view-open-handler.ts:24:sourcerer
theia/extensions/tab-uris/src/browser/view-open-handler.ts:101:sourcerer
theia/extensions/tab-uris/src/browser/view-open-handler.ts:110:sourcerer
theia/extensions/tab-uris/src/browser/view-open-handler.ts:119:sourcerer
theia/extensions/token-gate/package.json:3:sourcerer
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:3:SOURCERER
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:3:sourcerer
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:6:SOURCERER_SUPERVISED
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:18:SOURCERER_SUPERVISED
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:21:Sourcerer
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:26:SOURCERER
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:26:sourcerer
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:28:Sourcerer
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:31:SOURCERER
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:51:Sourcerer
theia/extensions/token-gate/src/node/sourcerer-env.ts:12:SOURCERER_SUPERVISED
theia/extensions/token-gate/src/node/sourcerer-env.ts:14:Sourcerer
theia/extensions/token-gate/src/node/sourcerer-env.ts:18:SOURCERER_TOKEN_DISABLE
theia/extensions/token-gate/src/node/sourcerer-env.ts:22:SOURCERER
theia/extensions/token-gate/src/node/sourcerer-env.ts:31:SOURCERER_TOKEN
theia/extensions/token-gate/src/node/sourcerer-env.ts:38:SourcererAPI
theia/extensions/token-gate/src/node/sourcerer-env.ts:57:Sourcerer
theia/extensions/token-gate/src/node/sourcerer-env.ts:68:SOURCERER
theia/extensions/token-gate/src/node/sourcerer-env.ts:115:SOURCERER_SUPERVISED
theia/extensions/token-gate/src/node/sourcerer-env.ts:117:SOURCERER_TOKEN
theia/extensions/token-gate/src/node/sourcerer-env.ts:122:SOURCERER_TOKEN
theia/extensions/token-gate/src/node/sourcerer-env.ts:126:SOURCERER
theia/extensions/token-gate/src/node/sourcerer-env.ts:128:SOURCERER_TOKEN
theia/extensions/token-gate/src/node/sourcerer-env.ts:133:SOURCERER
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:7:SOURCERER
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:7:sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:16:SOURCERER_TOKEN_COOKIE_NAME
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:16:SOURCERER_TOKEN
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:17:SOURCERER_TOKEN
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:18:SOURCERER_TOKEN_DISABLE
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:21:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:31:SOURCERER
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:31:sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:36:SOURCERER
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:39:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:45:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:50:SOURCERER
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:61:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:80:sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:89:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:102:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:114:sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:122:SOURCERER_BACKEND_READY
theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:148:SOURCERER_TOKEN_COOKIE_NAME
theia/extensions/token-gate/src/node/token-gate-backend-module.ts:3:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-module.ts:4:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-module.ts:7:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-module.ts:8:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-module.ts:10:Sourcerer
theia/extensions/token-gate/src/node/token-gate-backend-module.ts:11:Sourcerer
```

## Held back — frozen / coincidental occurrences the rename must not touch (104)

```
patches/010-sourcerer-identity.patch:21:MOZ_APP_UA_NAME  [frozen]
patches/010-sourcerer-identity.patch:22:MOZ_APP_ID  [frozen]
patches/020-sourcerer-shell.patch:21:MOZ_APP_UA_NAME  [frozen]
patches/020-sourcerer-shell.patch:22:MOZ_APP_ID  [frozen]
scripts/check-internals-boundary.sh:15:-PLAN.md  [frozen]
scripts/check-internals-boundary.sh:22:-PLAN.md  [frozen]
scripts/check-internals-boundary.sh:82:-PLAN.md  [frozen]
scripts/smoke-theia.sh:4:-PLAN.md  [frozen]
scripts/verify-branding-identity.mjs:67:-PLAN.md  [frozen]
scripts/verify-branding-identity.mjs:121:-PLAN.md  [frozen]
scripts/verify-branding-identity.mjs:485:-PLAN.md  [frozen]
scripts/verify-phase-03.sh:270:-PLAN.md  [frozen]
scripts/verify-phase-04.sh:110:-PLAN.md  [frozen]
scripts/verify-phase-05.sh:217:-PLAN.md  [frozen]
scripts/verify-phase-05.sh:991:-PLAN.md  [frozen]
scripts/verify-phase-05.sh:1948:-PLAN.md  [frozen]
scripts/verify-uri-roundtrip.mjs:53:-PLAN.md  [frozen]
sourcerer/branding/dev/content/jar.mn:12:%content/branding/  [frozen]
sourcerer/branding/dev/locales/en-US/brand.ftl:14:-brand-product-name = Firefox  [frozen]
sourcerer/branding/dev/locales/jar.mn:10:%locale/branding/  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:17:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:18:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:19:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:23:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:24:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:32:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:38:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:41:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:42:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:48:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:49:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:50:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:51:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:56:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:57:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:62:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:63:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:66:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:67:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:68:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:69:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:80:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:81:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:92:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:93:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:94:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:95:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:96:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:97:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:111:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:125:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:160:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:164:pref("  [frozen]
sourcerer/branding/dev/pref/firefox-branding.js:188:pref("  [frozen]
sourcerer/branding/release/content/jar.mn:12:%content/branding/  [frozen]
sourcerer/branding/release/locales/en-US/brand.ftl:14:-brand-product-name = Firefox  [frozen]
sourcerer/branding/release/locales/jar.mn:10:%locale/branding/  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:17:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:18:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:19:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:23:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:24:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:32:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:38:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:41:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:42:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:48:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:49:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:50:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:51:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:56:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:57:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:62:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:63:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:66:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:67:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:68:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:69:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:80:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:81:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:92:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:93:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:94:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:95:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:96:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:97:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:111:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:125:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:160:pref("  [frozen]
sourcerer/branding/release/pref/firefox-branding.js:164:pref("  [frozen]
sourcerer/INTERNAL-APIS.md:22:-PLAN.md  [frozen]
sourcerer/INTERNAL-APIS.md:23:-PLAN.md  [frozen]
sourcerer/INTERNAL-APIS.md:28:-PLAN.md  [frozen]
sourcerer/INTERNAL-APIS.md:29:-PLAN.md  [frozen]
sourcerer/INTERNAL-APIS.md:42:-PLAN.md  [frozen]
sourcerer/INTERNAL-APIS.md:43:-PLAN.md  [frozen]
sourcerer/shell/components.conf:16:{7539c85c-f1f6-43a3-9a45-48fd27140596}  [frozen]
sourcerer/shell/components.conf:20:"command-line-handler": "a-  [frozen]
sourcerer/shell/TheiaService.sys.mjs:377:-PLAN.md  [frozen]
sourcerer/sourcerer-release.desktop:3:/home/chris/coding/sourcerer  [coincidental]
sourcerer/sourcerer-release.desktop:4:/home/chris/coding/sourcerer  [coincidental]
sourcerer/sourcerer.desktop:3:/home/chris/coding/sourcerer  [coincidental]
sourcerer/sourcerer.desktop:4:/home/chris/coding/sourcerer  [coincidental]
theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:5:-PLAN.md  [frozen]
```

## Per-token totals

| token | case | class | scoped to | expected | observed |
|---|---|---|---|---|---|
| `{"name":"Sourcerer","vendor":"Deocracy"` | literal | identity | (all files in scope) | 1 | 1 |
| `{7539c85c-f1f6-43a3-9a45-48fd27140596}` | literal | frozen | (all files in scope) | 1 | 1 |
| `stockControl ? 'Firefox' : 'Sourcerer'` | literal | identity | (all files in scope) | 1 | 1 |
| `--with-app-basename=Sourcerer` | literal | identity | (all files in scope) | 1 | 1 |
| `-brand-product-name = Firefox` | literal | frozen | (all files in scope) | 2 | 2 |
| `/home/chris/coding/sourcerer` | lower | coincidental | (all files in scope) | 4 | 4 |
| `010-sourcerer-identity.patch` | lower | brand-identifier | (all files in scope) | 5 | 5 |
| `SOURCERER_TOKEN_COOKIE_NAME` | upper | brand-identifier | (all files in scope) | 2 | 2 |
| `"command-line-handler": "a-` | literal | frozen | (all files in scope) | 1 | 1 |
| `SOURCERER_BACKEND_READY` | upper | brand-identifier | (all files in scope) | 59 | 59 |
| `SOURCERER_TOKEN_DISABLE` | upper | brand-identifier | (all files in scope) | 9 | 9 |
| `SOURCERER_APP_IDENTITY` | upper | brand-identifier | (all files in scope) | 13 | 13 |
| `SourcererPrivilegedJs` | title | brand-identifier | (all files in scope) | 14 | 14 |
| `SOURCERER_SUPERVISED` | upper | brand-identifier | (all files in scope) | 14 | 14 |
| `SOURCERER_DEV_TREE` | upper | brand-identifier | (all files in scope) | 3 | 3 |
| `%content/branding/` | literal | frozen | (all files in scope) | 2 | 2 |
| `%locale/branding/` | literal | frozen | (all files in scope) | 2 | 2 |
| `SOURCERER_TOKEN` | upper | brand-identifier | (all files in scope) | 21 | 21 |
| `MOZ_APP_UA_NAME` | literal | frozen | (all files in scope) | 2 | 2 |
| `sourcerer.dev` | lower | identity | (all files in scope) | 0 | 0 |
| `SourcererAPI` | title | brand-identifier | (all files in scope) | 140 | 140 |
| `MOZ_APP_ID` | literal | frozen | (all files in scope) | 2 | 2 |
| `Sourcerer` | title | brand-display | sourcerer/branding/dev/locales/en-US/brand.ftl | 5 | 5 |
| `Sourcerer` | title | brand-display | sourcerer/branding/release/locales/en-US/brand.ftl | 5 | 5 |
| `Sourcerer` | title | brand-display | sourcerer/branding/dev/locales/en-US/brand.properties | 3 | 3 |
| `Sourcerer` | title | brand-display | sourcerer/branding/release/locales/en-US/brand.properties | 3 | 3 |
| `Sourcerer` | title | brand-display | sourcerer/branding/dev/configure.sh | 1 | 1 |
| `Sourcerer` | title | brand-display | sourcerer/branding/release/configure.sh | 1 | 1 |
| `Sourcerer` | title | brand-display | sourcerer/sourcerer.desktop | 1 | 1 |
| `Sourcerer` | title | brand-display | sourcerer/sourcerer-release.desktop | 1 | 1 |
| `Sourcerer` | title | brand-display | theia/applications/browser/package.json | 1 | 1 |
| `Sourcerer` | title | brand-display | LICENSE | 1 | 1 |
| `SOURCERER` | upper | brand-identifier | (all files in scope) | 104 | 104 |
| `Sourcerer` | title | brand-identifier | (all files in scope) | 132 | 132 |
| `sourcerer` | lower | brand-identifier | (all files in scope) | 383 | 383 |
| `Deocracy` | title | brand-display | sourcerer/branding/dev/locales/en-US/brand.ftl | 1 | 1 |
| `Deocracy` | title | brand-display | sourcerer/branding/release/locales/en-US/brand.ftl | 1 | 1 |
| `Deocracy` | title | brand-display | LICENSE | 1 | 1 |
| `Deocracy` | title | brand-identifier | (all files in scope) | 4 | 4 |
| `deocracy` | lower | brand-identifier | (all files in scope) | 2 | 2 |
| `-PLAN.md` | literal | frozen | (all files in scope) | 21 | 21 |
| `pref("` | literal | frozen | sourcerer/branding/dev/pref/firefox-branding.js<br>sourcerer/branding/release/pref/firefox-branding.js | 67 | 67 |
