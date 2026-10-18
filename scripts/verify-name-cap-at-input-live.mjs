#!/usr/bin/env node
/**
 * modes-name-cap-at-input-live (full tier: the built binary, the sidecar and
 * a headless browser). G-23 / MODE-02: the Save as Mode and Save Setup name
 * fields hold at most the contracted cap while the user types or pastes.
 *
 *   (a) probe control: the stock uncapped QuickInputService.input() field
 *       holds all 70 characters written to it, so the probe can see a field
 *       the cut does not reach;
 *   (b) Save as Mode: a 70-character value reads back as its first cap
 *       characters, a character inserted mid-string into the full field
 *       pushes the last one off, and the stored mode name is that value;
 *   (c) Save Setup: the same two writes, and the stored setup name.
 *
 * The cap and the command ids are derived from source. Like the other
 * pb-relaunch rows this has no --self-test; the probe control in (a) stands
 * in for one, because a probe that cannot see an uncut field goes red there.
 */
import { probe, runCheck, sourceConst, sourceMatch, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'modes-name-cap-at-input-live';
const MODE_CAP = Number(sourceMatch('theia/extensions/modes/src/browser/mode-service.ts', /\bMODE_NAME_MAX = (\d+)/));
const SETUP_CAP = Number(sourceMatch('theia/extensions/modes/src/browser/setups-service.ts', /\bSETUP_NAME_MAX = (\d+)/));
const SAVE_AS_MODE = sourceConst('theia/extensions/modes/src/browser/modes-commands.ts', 'MODES_SAVE_AS_MODE_COMMAND_ID');
const SAVE_SETUP = sourceConst('theia/extensions/modes/src/browser/setups-commands.ts', 'SETUPS_SAVE_COMMAND_ID');
// 70 distinct non-space characters; no Z, so the inserted Z is unambiguous.
const V = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY0123456789-_.,;:!?+';

await runCheck(LABEL, async ({ profile, fail }) => {
    if (V.length !== 70 || new Set(V).size !== 70) {
        fail(`harness: the probe value is ${V.length} characters, ${new Set(V).size} distinct, not 70 distinct`);
        return;
    }
    if (!(MODE_CAP > 0) || MODE_CAP !== SETUP_CAP) {
        fail(`MODE_NAME_MAX (${MODE_CAP}) and SETUP_NAME_MAX (${SETUP_CAP}) are not one positive cap`);
        return;
    }
    const cap = MODE_CAP;
    const inserted = V.slice(0, 30) + 'Z' + V.slice(30, 60);
    const seen = await withShell(profile, app => probe(app, `
        const V = ${JSON.stringify(V)};
        const INSERTED = ${JSON.stringify(inserted)};
        const commands = get('CommandRegistry');
        const quickInput = get('QuickInputService');
        const files = get('FileService');
        const field = () => [...document.querySelectorAll('.quick-input-widget .quick-input-box input')]
            .find(element => element.offsetParent !== null) || null;
        const write = text => {
            const element = field();
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        };
        // Reads the field once it has held one value for 300 ms (2 s at most).
        const settled = async () => {
            let last;
            let since = Date.now();
            await until(() => {
                const value = field() ? field().value : null;
                if (value !== last) { last = value; since = Date.now(); }
                return Date.now() - since >= 300;
            }, 2000);
            return last;
        };
        let acceptPath = null;
        const accept = () => {
            let impl = null;
            try { impl = get('MonacoQuickInputImplementation'); } catch (e) { impl = null; }
            if (impl && typeof impl.accept === 'function') {
                acceptPath = 'MonacoQuickInputImplementation.accept()';
                return impl.accept();
            }
            acceptPath = 'keydown Enter on the field';
            const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
            Object.defineProperty(event, 'keyCode', { get: () => 13 });
            field().dispatchEvent(event);
        };
        const leg = async (commandId, readStored) => {
            const running = commands.executeCommand(commandId);
            if (!(await until(() => field() !== null, 10000))) {
                return { error: 'no visible quick-input field opened for ' + commandId };
            }
            write(V);
            const full = await settled();
            write(INSERTED);
            const afterInsert = await settled();
            await accept();
            await running;
            await sleep(500);
            return { full, afterInsert, stored: await readStored() };
        };

        // (a) probe control: the stock uncapped input.
        void quickInput.input({});
        if (!(await until(() => field() !== null, 10000))) {
            return { error: 'the stock quick input never showed a visible field' };
        }
        write(V);
        const control = await settled();
        quickInput.hide();
        if (!(await until(() => field() === null, 5000))) {
            return { error: 'the stock quick input did not close on hide()' };
        }

        const modes = get('ModeService');
        const mode = await leg(${JSON.stringify(SAVE_AS_MODE)}, async () => {
            const stored = JSON.parse((await files.read(modes.modesUri)).value);
            return (stored.customs || []).map(row => row.name);
        });
        if (mode.error) { return mode; }
        const setups = get('SetupsService');
        const setup = await leg(${JSON.stringify(SAVE_SETUP)}, async () => {
            const stored = JSON.parse((await files.read(setups.setupsUri)).value);
            return (stored.setups || []).map(row => row.name);
        });
        if (setup.error) { return setup; }
        return { control, mode, setup, acceptPath };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.control !== V) {
        fail(`probe control: the stock uncapped input held ${JSON.stringify(seen.control)}, not the 70 characters written; the probe cannot see a field`);
        return;
    }
    const wantFull = V.slice(0, cap);
    const wantInsert = inserted.slice(0, cap);
    for (const [name, result] of [['Save as Mode', seen.mode], ['Save Setup', seen.setup]]) {
        if (result.full !== wantFull) {
            fail(`${name}: a 70-character write read back as ${JSON.stringify(result.full)} (${String(result.full).length} characters), not its first ${cap}`);
        }
        if (result.afterInsert !== wantInsert) {
            fail(`${name}: a character inserted into the full field read back as ${JSON.stringify(result.afterInsert)}, not the first ${cap} of the inserted string`);
        }
        const matches = (result.stored || []).filter(stored => stored === wantInsert).length;
        if (matches !== 1) {
            fail(`${name}: the store holds ${JSON.stringify(result.stored)}, not one row named the accepted ${cap}-character value`);
        }
        console.log(`${LABEL}: ${name}: 70 characters read back as ${String(result.full).length}; the mid-string insert kept the first ${cap}; stored name ${JSON.stringify(result.stored)}`);
    }
    console.log(`${LABEL}: accept path: ${seen.acceptPath}`);
    console.log(`${LABEL}: probe control: the stock uncapped input held ${String(seen.control).length} characters`);
});
