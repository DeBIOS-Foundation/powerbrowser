#!/usr/bin/env node
// scripts/verify-ng-011-settings-table-read.mjs -- NG-011 (non-GUI wave A):
// tabs.sqlite has a settings table holding restore behaviour and age tiers;
// the Theia reader serves it; and the launch restore honours
// restore_behaviour and restore_live_minutes (part B needs wave C's restore,
// Task 10).

import { join } from 'node:path';
import { newProfile, runCheck, sleep, withShell, withShellQuit } from './lib/ng-a-live.mjs';
import { buildStore, readStore, schemaHead } from './lib/tab-store-fixtures.mjs';

await runCheck('verify-ng-011-settings-table-read', async ({ pages, expect }) => {
    // A. The table and its reader.
    const profile = newProfile('ng011');
    const served = await withShell(profile, async ({ run }) => run(`
        const got = await A.outcome(() => A.reader().getSettings());
        return got.resolved ? got.value : { error: got.message };
    `));
    const stored = readStore(join(profile, 'tabs.sqlite')).settings;
    for (const key of ['closed_retention_days', 'integrity_check_minutes', 'restore_behaviour', 'restore_live_minutes', 'restore_url_days']) {
        expect(key in stored, `tabs.sqlite has no settings row ${key}: ${JSON.stringify(stored)}`);
        expect(served && served[key] === stored[key], `the Theia reader does not serve setting ${key}: ${JSON.stringify(served)}`);
    }
    // B. The launch restore reads restore_behaviour and the live-state tier.
    const a = pages.url('/a');
    const b = pages.url('/b');
    for (const [behaviour, liveMinutes, wantOpen, wantHistory] of [['session', '5', true, true], ['session', '0', true, false], ['none', '5', false, false]]) {
        const p = newProfile(`ng011-${behaviour}-${liveMinutes}`);
        buildStore(join(p, 'tabs.sqlite'), schemaHead(), { settings: { restore_behaviour: behaviour, restore_live_minutes: liveMinutes } });
        await withShellQuit(p, async ({ run, topLevelContexts, evaluateIn, send }) => {
            await run(`await A.open(${JSON.stringify(a)});`);
            await sleep(2000);
            const ctx = (await topLevelContexts()).find(x => x.url === a);
            if (ctx) {
                await send('input.performActions', {
                    context: ctx.context,
                    actions: [{
                        type: 'pointer', id: 'ng011-mouse', parameters: { pointerType: 'mouse' },
                        actions: [{ type: 'pointerMove', x: 20, y: 20 }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }],
                    }],
                });
                await send('input.releaseActions', { context: ctx.context });
                await evaluateIn(ctx.context, "document.getElementById('next').click(); true");
            }
            await sleep(3000);
            const backBeforeQuit = await run(`
                const tab = A.webTabs().find(w => w.url === ${JSON.stringify(b)});
                return !!tab && tab.canGoBack === true;
            `);
            expect(backBeforeQuit, `before the quit the tab on ${b} cannot go back, so there is no back history for the restore to keep`);
        });
        const got = await withShellQuit(p, async ({ run }) => {
            await sleep(4000);
            return run(`
                const tab = A.webTabs().find(w => w.url === ${JSON.stringify(b)});
                return { open: !!tab, canGoBack: !!(tab && tab.canGoBack) };
            `);
        });
        expect(got.open === wantOpen, `restore_behaviour=${behaviour}: the web tab was ${got.open ? '' : 'not '}restored at launch`);
        if (wantOpen) {
            expect(got.canGoBack === wantHistory, `restore_live_minutes=${liveMinutes}: the restored tab ${got.canGoBack ? 'kept' : 'lost'} its back history`);
        }
    }
});
