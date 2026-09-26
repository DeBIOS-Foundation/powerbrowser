#!/usr/bin/env node
/**
 * NG-035 (full tier, live-clone lane): a custom mode saves the layout, not
 * only three panel flags, and the shipped defaults are data. Evidence:
 * mode-service.ts:23-28, 76-81, 371-376; the hard-coded furniture rule
 * (:306) and visibilityFor (:403-414); 14-CONTEXT.md:33.
 *
 *   (a) data: mode-service.ts exports SHIPPED_MODE_RULES, one one-line row
 *       per shipped id, and looks a mode's rules up in it by id; no source of
 *       the modes extension branches on a shipped mode id (===/!==, case, a
 *       literal list or Set, a map keyed by ids) -- the ids are derived from
 *       the descriptors, so a new shipped mode is covered;
 *   (b) load: a modes.json row with views and furniture is applied when the
 *       mode is activated through the modes command (the Explorer moves to
 *       the right panel, the IDE furniture shows);
 *   (c) save: Save as Mode, run through the command registry, writes the
 *       views and the furniture into the new row;
 *   (d) Review Focus: a row written before this wave (three flags only)
 *       still loads and applies its flags.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, probe, runCheck, sourceConst, sourceMatch, withShell } from './lib/pb-relaunch.mjs';

const LABEL = 'ng-035-custom-mode-saves-layout';
const SERVICE_REL = 'theia/extensions/modes/src/browser/mode-service.ts';
const DESCRIPTORS_REL = 'theia/extensions/modes/src/browser/mode-descriptors.ts';
const COMMANDS_REL = 'theia/extensions/modes/src/browser/modes-commands.ts';
const ACTIVATE = sourceConst(COMMANDS_REL, 'MODES_ACTIVATE_COMMAND_ID');
const SAVE_AS_MODE = sourceConst(COMMANDS_REL, 'MODES_SAVE_AS_MODE_COMMAND_ID');
const MODES_SRC_REL = 'theia/extensions/modes/src';
const EXPLORER = sourceMatch(DESCRIPTORS_REL, /\['([^']+)',\s*'left'\]/);
const DATA = 'NG035 Data';
const LEGACY = 'NG035 Legacy';
const STORE = JSON.stringify({
    version: 1,
    customs: [
        { name: DATA, leftVisible: false, rightVisible: true, bottomVisible: false, furniture: true, views: { left: [], right: [EXPLORER], bottom: [] } },
        { name: LEGACY, leftVisible: true, rightVisible: false, bottomVisible: false },
    ],
});

/** Source text with comments blanked, line numbers kept. */
function code(rel) {
    return readFileSync(join(REPO_ROOT, rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ''))
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Part (a). The table is the Produces contract (Task 9): `export const
 * SHIPPED_MODE_RULES`, whose body runs to the next line at column 0, one
 * line per shipped row. Its rows are the one place a shipped id may key a
 * map; everywhere else in the modes extension a shipped id beside ===/!==,
 * after `case`, in a literal list or Set, or as one of two or more map keys
 * within five lines is a branch. Known ceiling: a branch on a constant that
 * aliases an id (organising-widget.ts's ORGANISING_MODE_ID) is not seen.
 */
function shippedRuleProblems() {
    const ids = [...readFileSync(join(REPO_ROOT, DESCRIPTORS_REL), 'utf8').matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);
    const problems = [];
    const serviceLines = code(SERVICE_REL).split('\n');
    const start = serviceLines.findIndex(line => /^export const SHIPPED_MODE_RULES\b/.test(line));
    if (start < 0) {
        problems.push(`${SERVICE_REL} exports no SHIPPED_MODE_RULES table, so the shipped defaults are not data`);
    } else {
        const end = serviceLines.findIndex((line, index) => index > start && /^\S/.test(line));
        const rows = serviceLines.slice(start + 1, end < 0 ? serviceLines.length : end);
        for (const id of ids) {
            const count = rows.filter(line => new RegExp(`^\\s*(['"]?)${id}\\1\\s*:\\s*\\{.*\\}\\s*,?\\s*$`).test(line)).length;
            if (count !== 1) {
                problems.push(`SHIPPED_MODE_RULES has ${count} one-line row(s) for shipped mode '${id}', not 1`);
            }
        }
        serviceLines.fill('', start, end < 0 ? serviceLines.length : end + 1);
        if (!/SHIPPED_MODE_RULES\s*\[\s*[A-Za-z_$]/.test(serviceLines.join('\n'))) {
            problems.push(`${SERVICE_REL} never looks a mode's rules up in SHIPPED_MODE_RULES by its id, so panels and furniture are not read from the table`);
        }
    }
    const branches = [];
    const files = readdirSync(join(REPO_ROOT, MODES_SRC_REL), { recursive: true })
        .map(name => join(MODES_SRC_REL, name))
        .filter(rel => /\.tsx?$/.test(rel) && rel !== DESCRIPTORS_REL);
    for (const rel of files) {
        const lines = rel === SERVICE_REL ? serviceLines : code(rel).split('\n');
        const keys = [];
        lines.forEach((line, index) => {
            for (const id of ids) {
                const q = `['"]${id}['"]`;
                const forms = [
                    `[!=]==?\\s*${q}`, `${q}\\s*[!=]==?`, `\\bcase\\s+${q}\\s*:`,
                    `\\[[^\\[\\]]*${q}[^\\[\\]]*\\]\\s*\\.\\s*(?:includes|indexOf)\\s*\\(`,
                    `new\\s+Set\\s*\\(\\s*\\[[^\\]]*${q}`,
                ];
                for (const form of forms) {
                    for (const m of line.matchAll(new RegExp(form, 'g'))) {
                        branches.push(`${rel.split('/').pop()}:${index + 1} ${m[0].trim()}`);
                    }
                }
                if (new RegExp(`(?:^|[{,])\\s*(['"]?)${id}\\1\\s*:(?!:)`).test(line)) {
                    keys.push({ id, line: index + 1 });
                }
            }
        });
        for (const key of keys) {
            const other = keys.find(candidate => candidate.id !== key.id && candidate.line >= key.line && candidate.line - key.line <= 5);
            if (other) {
                branches.push(`${rel.split('/').pop()}:${key.line} a map keyed by '${key.id}' and '${other.id}'`);
            }
        }
    }
    if (branches.length) {
        problems.push(`the modes extension branches on shipped mode ids (${[...new Set(branches)].join(', ')}); the shipped defaults are code, not data`);
    }
    return problems;
}

await runCheck(LABEL, async ({ profile, fail }) => {
    shippedRuleProblems().forEach(fail);
    const seen = await withShell(profile, app => probe(app, `
        const modes = get('ModeService');
        const commands = get('CommandRegistry');
        const appShell = get('ApplicationShell');
        const files = get('FileService');
        await files.write(modes.modesUri, ${JSON.stringify(STORE)});
        if (!(await until(() => modes.getCustomModes().length === 2, 10000))) {
            return { error: 'the two custom modes never loaded from modes.json' };
        }
        // The ids the product gave the rows, so the check spells none itself.
        const idOf = name => (modes.getCustomModes().find(mode => mode.name === name) || {}).id;
        const legacyId = idOf(${JSON.stringify(LEGACY)});
        const dataId = idOf(${JSON.stringify(DATA)});
        if (!legacyId || !dataId) {
            return { error: 'the loaded custom modes carry no ids: ' + JSON.stringify(modes.getCustomModes()) };
        }
        const explorerArea = () => {
            const widget = get('WidgetManager').tryGetWidget(${JSON.stringify(EXPLORER)});
            return widget && widget.isAttached ? appShell.getAreaFor(widget) : null;
        };
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, legacyId);
        await sleep(1000);
        const legacy = { left: appShell.isExpanded('left'), right: appShell.isExpanded('right'), statusBarHidden: get('StatusBarImpl').isHidden };
        await commands.executeCommand(${JSON.stringify(ACTIVATE)}, dataId);
        await sleep(1000);
        const data = { explorer: explorerArea(), right: appShell.isExpanded('right'), statusBarHidden: get('StatusBarImpl').isHidden };
        const input = get('QuickInputService');
        const original = input.input;
        input.input = async () => 'NG035 Saved';
        try {
            await commands.executeCommand(${JSON.stringify(SAVE_AS_MODE)});
        } finally {
            input.input = original;
        }
        await sleep(500);
        const stored = JSON.parse((await files.read(modes.modesUri)).value);
        return { legacy, data, saved: (stored.customs || []).find(row => row.name === 'NG035 Saved') || null };
    `));
    if (seen.error) {
        fail(`harness: ${seen.error}`);
        return;
    }
    if (seen.legacy.left !== true || seen.legacy.right !== false || seen.legacy.statusBarHidden !== true) {
        fail(`a modes.json row written before this wave no longer applies its flags (${JSON.stringify(seen.legacy)})`);
    }
    if (seen.data.explorer !== 'right') {
        fail(`activating a custom mode whose views dock the Explorer on the right left it in '${seen.data.explorer}'`);
    }
    if (seen.data.right !== true) {
        fail('activating a custom mode with the right panel open left it collapsed');
    }
    if (seen.data.statusBarHidden !== false) {
        fail('activating a custom mode with furniture: true hid the status bar; furniture is not data');
    }
    if (!seen.saved) {
        fail('Save as Mode wrote no NG035 Saved row');
        return;
    }
    if (!seen.saved.views || !Array.isArray(seen.saved.views.right) || !seen.saved.views.right.includes(EXPLORER)) {
        fail(`Save as Mode stored no layout: the saved row's views are ${JSON.stringify(seen.saved.views)}, and the Explorer was docked right`);
    }
    if (seen.saved.furniture !== true) {
        fail(`Save as Mode stored furniture ${JSON.stringify(seen.saved.furniture)} while the status bar was showing`);
    }
});
