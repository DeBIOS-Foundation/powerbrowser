#!/usr/bin/env node
/**
 * NG-031 (full tier, live-clone lane): Restore Setup and the dependent-window
 * command are reachable from the command palette and a menu. Evidence: both
 * registered with no label (setups-commands.ts:31-37), and no menu entry
 * exists; notes/browser-window-model.md:39-40. Reads the live palette list
 * (QuickCommandService.getCommands, the list the palette renders) and the
 * live menu-bar model (MenuModelRegistry, what the menu bar is filled from).
 */
import { probe, runCheck, sourceConst, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-031-setup-commands-reachable';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/setups-commands.ts';
const IDS = [sourceConst(COMMANDS_REL, 'SETUPS_RESTORE_COMMAND_ID'), sourceConst(COMMANDS_REL, 'SETUPS_OPEN_DEPENDENT_COMMAND_ID')];

await runCheck(LABEL, async ({ profile, fail }) => {
    const seen = await withShell(profile, app => probe(app, `
        const ids = ${JSON.stringify(IDS)};
        const commands = get('CommandRegistry');
        const labels = ids.map(id => {
            const command = commands.getCommand(id);
            return command && command.label ? command.label : null;
        });
        const listed = get('QuickCommandService').getCommands();
        const palette = [...listed.recent, ...listed.other].map(command => command.id);
        const collect = (node, out) => {
            if (!node) return out;
            if (typeof node.id === 'string') out.push(node.id);
            for (const child of node.children || []) collect(child, out);
            return out;
        };
        // MAIN_MENU_BAR is ['menubar'] in @theia/core's menu types.
        const inMenuBar = collect(get('MenuModelRegistry').getMenu(['menubar']), []);
        return { labels, palette: ids.map(id => palette.includes(id)), menu: ids.map(id => inMenuBar.includes(id)) };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    IDS.forEach((id, index) => {
        if (!seen.labels[index]) {
            fail(`${id} has no label, so the command palette cannot show it`);
        }
        if (!seen.palette[index]) {
            fail(`${id} is not in the command palette's list`);
        }
        if (!seen.menu[index]) {
            fail(`${id} is in no menu of the menu bar`);
        }
    });
});
