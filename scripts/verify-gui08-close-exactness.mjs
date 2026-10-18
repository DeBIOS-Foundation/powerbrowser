#!/usr/bin/env node
// scripts/verify-gui08-close-exactness.mjs
//
// GUI-08's close-exactness gate (15-03; rewritten for PAN-04 in 22-04): x
// closes the group into its undo window with no dialog, and the close is
// written only when that window ends or PowerBrowser quits. Undo reverses the
// paint and writes nothing. When the close is written it closes exactly that
// group's tabs and removes its box, and activity never rests on a removed box.
// The last visible group cannot be closed (PAN-06, 22-05).
//
// It DERIVES at check time from the tree:
//   (a) the widget's closeGroupById constructs no dialog, calls no commit,
//       and reaches the model close (`closeGroup(this.actor`);
//   (b) the model's closeGroup writes no `kind: 'closeGroup'` and arms a
//       setTimeout naming UNDO_CLOSE_MS whose callback reaches commitClose;
//   (c) commitClose carries the `kind: 'closeGroup'` write;
//   (d) undoCloseGroup clears the timer and writes nothing (no `.mutate(`);
//   (e) an onWillFlush listener reaches commitAllClosing (the quit flush);
//   (f) the activity hand-off `this.groups[0]?.id` stays;
//   (g) the chrome-side close surface (the closeGroup dispatch arm reaching
//       the per-tab stock close loop, the member rows marked closed, the
//       group row deleted, idempotent on an unknown group);
//   (h) the model's closeGroup starts with a canCloseGroup( guard that returns;
//   (i) canCloseGroup compares this.groups.length with 1 (pending groups are
//       already out of groups, so they do not count);
//   (j) the widget builds pb-org-box-close only inside an if naming canCloseGroup(;
//   (k) the tree builds pb-org-tree-close only inside if (hooks.closable).
// Each is reported BY NAME. An underivable anchor fails as a broken
// instrument, never passes as clean.
//
// The live halves are recorded below as flat BACKSTOPS and report HELD-OUT
// for the full suite: reserved live, never a silent pass.
// pan04-undo-close-group-live and ng-006 are their live proofs.
//
// Honestly --quick: reads text sources only. No build, no browser, no
// display, no network.
//
// Usage:
//   node scripts/verify-gui08-close-exactness.mjs
//   node scripts/verify-gui08-close-exactness.mjs --self-test

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-gui08-close-exactness';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

const WIDGET_REL = 'theia/extensions/modes/src/browser/organising-widget.ts';
const MODEL_REL = 'theia/extensions/modes/src/browser/group-model.ts';
const TREE_REL = 'theia/extensions/modes/src/browser/organising-tree.ts';
const API_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';

/**
 * The declared close contract. The ONE hand-kept block in this file:
 * editing it is how a deliberate contract change is made -- it shows up in
 * the diff for review. Everything it is compared against is derived at
 * check time from the sources named above.
 */
const EXPECTED_CLOSE_KIND = "kind: 'closeGroup'";
const EXPECTED_DISPATCH_ARM = 'case "closeGroup":';
const EXPECTED_CLOSE_CALL = 'closeGroupRows(data.id)';

/**
 * Held-out live halves (15-UI-SPEC.md and 22-UI-SPEC backstops). Flat
 * scalars: no evidence attached, so the gate reports them HELD-OUT -- never
 * a silent pass.
 */
const BACKSTOPS = Object.freeze([
    { statement: 'Undo Close Group restores title, bounds, membership, card order and tabs', verification: 'backstop' },
    { statement: 'after the undo window the group tabs are closed and its box is gone', verification: 'backstop' },
    { statement: 'activity never rests on a removed box after Close Group', verification: 'backstop' },
    { statement: 'with one visible group no close control renders on canvas or tree; a second group brings both back', verification: 'backstop' },
]);

/** Text from `head` to the brace closing the body that opens at the end of its line, or ''. */
function methodBody(src, head) {
    const at = src.indexOf(head);
    if (at < 0) {
        return '';
    }
    // The body brace ends its line; a return type such as `Promise<{ ... }>` does not.
    const open = src.indexOf('{\n', at);
    if (open < 0) {
        return '';
    }
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') {
            depth += 1;
        } else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return src.slice(at, i + 1);
            }
        }
    }
    return '';
}

/** Text of the call from `head` (which ends in `(`) to its closing paren, or ''. */
function callSpan(src, head) {
    const at = src.indexOf(head);
    if (at < 0) {
        return '';
    }
    let depth = 0;
    for (let i = at + head.length - 1; i < src.length; i += 1) {
        if (src[i] === '(') {
            depth += 1;
        } else if (src[i] === ')') {
            depth -= 1;
            if (depth === 0) {
                return src.slice(at, i + 1);
            }
        }
    }
    return '';
}

/** The head of the block enclosing `at` (its text from line start to the opening brace), or ''. */
function enclosingHead(src, at) {
    let depth = 0;
    for (let i = at; i >= 0; i -= 1) {
        if (src[i] === '}') {
            depth += 1;
        } else if (src[i] === '{') {
            if (depth === 0) {
                return src.slice(src.lastIndexOf('\n', i) + 1, i + 1).trim();
            }
            depth -= 1;
        }
    }
    return '';
}

/** Failure messages for every `className = '<cls>'` in src not directly inside a block whose head passes `ok`. */
function guardedBuilds(rel, src, cls, ok, want) {
    const needle = `className = '${cls}'`;
    const failures = [];
    let at = src.indexOf(needle);
    if (at < 0) {
        return [`${rel}: no ${needle} -- the close button anchor drifted`];
    }
    for (; at >= 0; at = src.indexOf(needle, at + 1)) {
        const head = enclosingHead(src, at);
        if (!ok(head)) {
            failures.push(`${rel}: ${cls} is built outside ${want} (enclosing block: '${head}') -- the last remaining group shows a close control`);
        }
    }
    return failures;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const modelSrc = sources[MODEL_REL] ?? '';
    const apiSrc = sources[API_REL] ?? '';
    const treeSrc = sources[TREE_REL] ?? '';

    // (a) The click path: no dialog, no commit, reaches the model close.
    const closePath = methodBody(widgetSrc, 'async closeGroupById(');
    if (!closePath) {
        failures.push(`${WIDGET_REL}: 'closeGroupById' underivable -- the close anchor drifted`);
    } else {
        if (/new [A-Za-z]*Dialog\(/.test(closePath)) {
            failures.push(`${WIDGET_REL}: closeGroupById constructs a dialog -- the close confirmation is back, and Undo Close Group replaced it (22-UI-SPEC A1)`);
        }
        if (/commit(?:All)?Clos(?:e|ing)\(/.test(closePath)) {
            failures.push(`${WIDGET_REL}: closeGroupById calls a commit -- the click writes the close instead of the undo window's timer or the quit flush`);
        }
        if (!closePath.includes('closeGroup(this.actor')) {
            failures.push(`${WIDGET_REL}: closeGroupById never reaches 'closeGroup(this.actor' -- x closes nothing`);
        }
    }

    // (b) The model close hides and arms the timer; it writes nothing.
    const closeBody = methodBody(modelSrc, 'async closeGroup(');
    if (!closeBody) {
        failures.push(`${MODEL_REL}: 'closeGroup' underivable -- the model close anchor drifted`);
    } else {
        if (closeBody.includes(EXPECTED_CLOSE_KIND)) {
            failures.push(`${MODEL_REL}: closeGroup carries the ${EXPECTED_CLOSE_KIND} write -- the close is written at the click, before its undo window`);
        }
        const timer = callSpan(closeBody, 'setTimeout(');
        if (!timer) {
            failures.push(`${MODEL_REL}: closeGroup arms no setTimeout -- the undo window never ends, so the close is never written`);
        } else {
            if (!timer.includes('UNDO_CLOSE_MS')) {
                failures.push(`${MODEL_REL}: closeGroup's setTimeout does not name UNDO_CLOSE_MS -- the window length drifted from its contract`);
            }
            if (!timer.includes('commitClose(')) {
                failures.push(`${MODEL_REL}: closeGroup's setTimeout callback never reaches commitClose( -- the window ends without writing the close`);
            }
        }
    }

    // (c) The commit carries the write.
    const commitBody = methodBody(modelSrc, 'async commitClose(');
    if (!commitBody) {
        failures.push(`${MODEL_REL}: 'commitClose' underivable -- the commit anchor drifted`);
    } else if (!commitBody.includes(EXPECTED_CLOSE_KIND)) {
        failures.push(`${MODEL_REL}: commitClose has no ${EXPECTED_CLOSE_KIND} mutate -- the commit never reaches the chrome-side close arm`);
    }

    // (d) Undo clears the timer and writes nothing.
    const undoBody = methodBody(modelSrc, '\n    undoCloseGroup(');
    if (!undoBody) {
        failures.push(`${MODEL_REL}: 'undoCloseGroup' underivable -- the undo anchor drifted`);
    } else {
        if (!undoBody.includes('clearTimeout(')) {
            failures.push(`${MODEL_REL}: undoCloseGroup never calls clearTimeout( -- the timer still commits a restored group`);
        }
        if (undoBody.includes('.mutate(')) {
            failures.push(`${MODEL_REL}: undoCloseGroup calls .mutate( -- Undo writes, but the close it reverses was never written`);
        }
    }

    // (e) The quit flush commits every pending close (22-UI-SPEC A4).
    const flush = callSpan(modelSrc, 'onWillFlush(');
    if (!flush) {
        failures.push(`${MODEL_REL}: no onWillFlush listener -- a quit inside an undo window leaves the close unwritten`);
    } else if (!flush.includes('commitAllClosing(')) {
        failures.push(`${MODEL_REL}: the onWillFlush listener never reaches commitAllClosing( -- a quit inside an undo window leaves the close unwritten`);
    }

    // (f) The activity hand-off to the next remaining box (never a removed one).
    if (!modelSrc.includes('this.groups[0]?.id')) {
        failures.push(`${MODEL_REL}: the activity handoff ('this.groups[0]?.id') is gone -- activity can rest on the removed box`);
    }

    // (g) Chrome wiring: the dispatch arm reaches the per-tab stock close
    // loop plus the member-row close in one surface.
    if (!apiSrc.includes(EXPECTED_DISPATCH_ARM)) {
        failures.push(`${API_REL}: no ${EXPECTED_DISPATCH_ARM} arm -- the close mutation reaches no chrome close`);
    }
    if (!apiSrc.includes(EXPECTED_CLOSE_CALL)) {
        failures.push(`${API_REL}: no ${EXPECTED_CLOSE_CALL} -- the dispatch arm never runs the per-tab close`);
    }
    if (!apiSrc.includes('closeStockTabByUri(uri)')) {
        failures.push(`${API_REL}: no per-tab 'closeStockTabByUri(uri)' call -- closing skips the stock tab container`);
    }
    if (!apiSrc.includes('for (const uri of members)')) {
        failures.push(`${API_REL}: no per-member close loop -- the exact tab set is not closed one by one`);
    }
    if (!apiSrc.includes('UPDATE tabs SET group_id = NULL, closed_at = COALESCE(closed_at, :now) WHERE group_id = :id')) {
        failures.push(`${API_REL}: no member-row close -- closed tabs leave open rows or lose their history (NG-006/NG-010)`);
    }
    if (!apiSrc.includes('DELETE FROM groups WHERE id')) {
        failures.push(`${API_REL}: no group-row DELETE -- the closed box survives in the store`);
    }
    // WR-02: close is idempotent -- an unknown group row resolves as
    // already-closed success so a retry-after-success (chrome close landed,
    // only the ack was lost) cannot throw into a ghost-box revert.
    if (!apiSrc.includes('return "already-closed"')) {
        failures.push(`${API_REL}: no 'return "already-closed"' -- closing an unknown group throws instead of resolving idempotent success, so a retry-after-success resurrects a ghost group`);
    }
    if (apiSrc.includes('closeGroupRows: unknown group')) {
        failures.push(`${API_REL}: the 'closeGroupRows: unknown group' throw is back -- the close path is not idempotent`);
    }

    // (h) The model guard is closeGroup's first statement, below every caller (PAN-06).
    if (closeBody) {
        const first = closeBody.slice(closeBody.indexOf('{\n') + 2).trimStart();
        if (!/^if \(!this\.canCloseGroup\(id\)\) \{\s*return\b/.test(first)) {
            failures.push(`${MODEL_REL}: closeGroup does not start with a canCloseGroup( guard that returns -- the close command can close the last remaining group`);
        }
    }

    // (i) The rule itself: more than one visible group.
    const canBody = methodBody(modelSrc, '\n    canCloseGroup(');
    if (!canBody) {
        failures.push(`${MODEL_REL}: 'canCloseGroup' underivable -- the last-group rule anchor drifted`);
    } else if (!/this\.groups\.length > 1\b/.test(canBody)) {
        failures.push(`${MODEL_REL}: canCloseGroup does not compare this.groups.length with 1 -- the last remaining group is closable, or more than the last is kept`);
    }

    // (j, k) Neither view builds a close control the rule forbids.
    failures.push(...guardedBuilds(WIDGET_REL, widgetSrc, 'pb-org-box-close',
        head => /^if \(.*canCloseGroup\(/.test(head), 'an if naming canCloseGroup('));
    failures.push(...guardedBuilds(TREE_REL, treeSrc, 'pb-org-tree-close',
        head => head === 'if (hooks.closable) {', "'if (hooks.closable)'"));
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [WIDGET_REL]: read(WIDGET_REL),
        [MODEL_REL]: read(MODEL_REL),
        [API_REL]: read(API_REL),
        [TREE_REL]: read(TREE_REL),
    };
}

function main() {
    const sources = readSources();
    const failures = [...checkStatic(sources)];
    if (failures.length) {
        console.error(`${NAME}: FAIL -- ${failures.length} failure(s):`);
        failures.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME}: PASS -- no dialog and no commit at the click; the timer and the quit flush commit; Undo clears the timer and writes nothing; exact close wiring; the last group has no close in the model, the canvas or the tree`);
    for (const backstop of BACKSTOPS) {
        console.log(`${NAME}: HELD-OUT (reserved live) -- ${backstop.statement} [verification: ${backstop.verification}]`);
    }
}

/** Replaces `from` with `to` inside the body `head` derives from, so a plant lands in that method only. */
const inBody = (head, from, to) => src => {
    const body = methodBody(src, head);
    return body ? src.replace(body, body.replace(from, to)) : src;
};

/** Planted faults on in-memory copies, each red naming its drift. */
const PLANTS = [
    { id: 'dialog construction re-added', file: WIDGET_REL,
        apply: inBody('async closeGroupById(', '        try {\n', "        const dialog = new ConfirmDialog({ title: 'Close Group' });\n        try {\n"),
        landed: s => s.includes("new ConfirmDialog({ title: 'Close Group' })"), expect: /constructs a dialog/ },
    { id: 'closeGroup write moved back into closeGroup', file: MODEL_REL,
        apply: inBody('async closeGroup(', '        this.closing.set(id,', "        await client.mutate({ kind: 'closeGroup', id });\n        this.closing.set(id,"),
        landed: s => methodBody(s, 'async closeGroup(').includes("kind: 'closeGroup'"), expect: /closeGroup carries the kind: 'closeGroup' write/ },
    { id: 'commit call added to closeGroupById', file: WIDGET_REL,
        apply: inBody('async closeGroupById(', '                await this.flash(', '                await this.model.commitClose(this.actor, id);\n                await this.flash('),
        landed: s => methodBody(s, 'async closeGroupById(').includes('commitClose('), expect: /closeGroupById calls a commit/ },
    { id: 'flush commit removed', file: MODEL_REL,
        apply: s => s.replace('event.waitUntil(this.commitAllClosing(this.actor))', 'event.waitUntil(Promise.resolve())'),
        landed: s => s.includes('event.waitUntil(Promise.resolve())'), expect: /onWillFlush listener never reaches commitAllClosing/ },
    { id: 'clearTimeout removed from undo', file: MODEL_REL,
        apply: inBody('\n    undoCloseGroup(', '        window.clearTimeout(entry.timer);\n', ''),
        landed: s => !methodBody(s, '\n    undoCloseGroup(').includes('clearTimeout('), expect: /undoCloseGroup never calls clearTimeout/ },
    { id: 'already-closed turned into a throw', file: API_REL,
        apply: s => s.replace('return "already-closed";', 'throw new Error(`closeGroupRows: unknown group ${id}`);'),
        landed: s => s.includes('closeGroupRows: unknown group'), expect: /already-closed|unknown group/ },
    { id: 'closeGroupRows(data.id) removed', file: API_REL,
        apply: s => s.replace('await PowerBrowserAPI.closeGroupRows(data.id);', 'await PowerBrowserAPI.removeGroupRow(data.id);'),
        landed: s => s.includes('await PowerBrowserAPI.removeGroupRow(data.id);'), expect: /closeGroupRows\(data\.id\)/ },
    { id: 'last-group guard removed from the model close', file: MODEL_REL,
        apply: inBody('async closeGroup(', /^( +)if \(!this\.canCloseGroup\(id\)\) \{\n +return undefined;\n +\}\n/m, ''),
        landed: s => !methodBody(s, 'async closeGroup(').includes('canCloseGroup('), expect: /closeGroup does not start with a canCloseGroup\( guard/ },
    { id: 'canvas close made unconditional', file: WIDGET_REL,
        apply: s => s.replace(/if \(this\.model\.canCloseGroup\(group\.id\)\) \{(\n +const close = document\.createElement)/, '{$1'),
        landed: s => !/if \(this\.model\.canCloseGroup\(group\.id\)\) \{\n +const close/.test(s), expect: /pb-org-box-close is built outside/ },
    { id: 'tree close made unconditional', file: TREE_REL,
        apply: s => s.replace('if (hooks.closable) {', '{'),
        landed: s => !s.includes('if (hooks.closable) {'), expect: /pb-org-tree-close is built outside/ },
];

function selfTest() {
    const real = readSources();
    const baseline = [...checkStatic(real)];
    if (baseline.length) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.forEach(f => console.error(`  ${f}`));
        process.exit(1);
    }
    console.log(`${NAME} --self-test: unmodified tree green, planting faults`);
    let failed = 0;
    for (const plant of PLANTS) {
        const text = plant.apply(real[plant.file]);
        if (text === real[plant.file] || !plant.landed(text)) {
            console.error(`${NAME} --self-test: FAIL -- '${plant.id}' anchor drifted in ${plant.file}: the plant did not land`);
            failed += 1;
            continue;
        }
        const result = checkStatic({ ...real, [plant.file]: text });
        const hit = result.find(f => plant.expect.test(f));
        if (!hit) {
            console.error(`${NAME} --self-test: FAIL -- '${plant.id}' did not go red naming ${plant.expect}; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  ${plant.id} -> ${hit}`);
        }
    }
    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- ${PLANTS.length} planted faults went red naming the drift`);
}

if (process.argv.includes('--self-test')) {
    try {
        selfTest();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
} else {
    try {
        main();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
