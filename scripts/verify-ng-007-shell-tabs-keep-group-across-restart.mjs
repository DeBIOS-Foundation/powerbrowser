#!/usr/bin/env node
// scripts/verify-ng-007-shell-tabs-keep-group-across-restart.mjs -- NG-007
// (non-GUI wave A): an editor and a terminal keep their group, and a loose
// terminal its canvas position, across a real quit and relaunch on the same
// profile (the backend port changes between launches, TheiaService.sys.mjs:602).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newProfile, runCheck, withShell } from './lib/ng-a-live.mjs';

await runCheck('verify-ng-007-shell-tabs-keep-group-across-restart', async ({ expect }) => {
    const profile = newProfile('ng007');
    const fileDir = mkdtempSync(join(tmpdir(), 'pb-ng007-file-'));
    process.on('exit', () => rmSync(fileDir, { recursive: true, force: true }));
    const file = join(fileDir, 'note.txt');
    writeFileSync(file, 'ng007\n');
    const fileUri = `file://${file}`;
    const first = await withShell(profile, async ({ run }) => run(`
        const main = { widgetOptions: { area: 'main' } };
        const editor = await A.open(${JSON.stringify(fileUri)}, main);
        const grouped = await A.open('terminal:ng007a', main);
        const loose = await A.open('terminal:ng007b', main);
        await A.sleep(1500);
        const group = await A.model().createGroup(A.actor(), { x: 40, y: 40 });
        await A.model().moveCard(A.actor(), await A.cardKey(editor), group.id);
        await A.model().moveCard(A.actor(), await A.cardKey(grouped), group.id);
        await A.model().placeCard(A.actor(), await A.cardKey(loose), 320, 240);
        await A.sleep(1500);
        return { group: group.id, port: location.port, editorKey: editor.getResourceUri().toString(true) };
    `));
    const second = await withShell(profile, async ({ run }) => run(`
        await A.organising();
        const before = A.model().getTabs(${JSON.stringify(first.group)}).map(t => t.uri);
        const main = { widgetOptions: { area: 'main' } };
        await A.open(${JSON.stringify(fileUri)}, main);
        await A.open('terminal:ng007a', main);
        await A.open('terminal:ng007b', main);
        await A.sleep(1500);
        await A.organising();
        return {
            port: location.port,
            before,
            after: A.model().getTabs(${JSON.stringify(first.group)}).map(t => t.uri),
            loose: A.model().listUngrouped().find(t => t.uri === 'terminal:ng007b') || null,
        };
    `));
    expect(first.port !== second.port, `the backend port did not change between launches (${first.port}), so the restart did not exercise a new frontend origin`);
    for (const key of [first.editorKey, 'terminal:ng007a']) {
        expect(second.before.includes(key), `after the restart, before anything reopened, group ${first.group} does not list ${key}: [${second.before.join(', ')}]`);
        expect(second.after.includes(key), `after the restart and reopening, ${key} is not back in group ${first.group}: [${second.after.join(', ')}]`);
    }
    expect(second.loose && second.loose.x === 320 && second.loose.y === 240, `after the restart the loose terminal lost its canvas position: ${JSON.stringify(second.loose)}`);
});
