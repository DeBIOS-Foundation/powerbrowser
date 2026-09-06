#!/usr/bin/env node
// scripts/verify-gui08-close-exactness.mjs
//
// GUI-08's close-exactness gate (15-03): confirming Close Group closes
// exactly that group's tabs and removes its box; cancelling changes
// nothing; activity never rests on a removed box.
//
// It DERIVES at check time from the tree: the confirmation dialog copy
// verbatim (title, singular/plural body, buttons), the cancel-before-
// mutation ordering in the widget's close path, the model close wiring
// (closeGroup actor kind plus the activity handoff), and the chrome-side
// close surface (the closeGroup dispatch arm reaching the per-tab stock
// close loop plus the row DELETEs). Each is compared as SET EQUALITY
// against the one EXPECTED block: a reworded dialog breaks the contracted
// copy, a cancel that mutates breaks the only-destructive-action
// discipline, a close that skips the per-tab loop orphans rows -- each
// reported BY NAME. An empty derivation fails as a broken instrument,
// never passes as clean.
//
// The live halves (confirm-closes-exact-tabs, cancel-no-op, and
// activity-never-on-removed-box through a headed shell) are recorded below
// as flat BACKSTOPS: at verify time no explicit evidence is attached, so
// they report HELD-OUT for the full suite -- reserved live, never a silent
// pass.
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
const API_REL = 'powerbrowser/shell/PowerBrowserAPI.sys.mjs';

/**
 * The declared close contract. The ONE hand-kept block in this file:
 * editing it is how a deliberate contract change is made -- it shows up in
 * the diff for review. Everything it is compared against is derived at
 * check time from the sources named above.
 */
const EXPECTED_DIALOG_TITLE = 'Close Group';
// 15-UI-REVIEW Top Fix #3: the body is singular/plural exact -- both forms
// are contracted (15-UI-SPEC.md Copywriting Contract), branched on
// `count === 1` in closeGroupById. Editing either form is a deliberate
// contract change -- it shows up in the diff for review.
const EXPECTED_DIALOG_MSG_ONE = 'Close "${group.title}"? Its 1 tab will close too. You can\'t undo this.';
const EXPECTED_DIALOG_MSG_MANY = 'Close "${group.title}"? Its ${count} tabs will close too. You can\'t undo this.';
const EXPECTED_DIALOG_OK = 'Close Group';
const EXPECTED_DIALOG_CANCEL = 'Cancel';
const EXPECTED_CLOSE_KIND = "kind: 'closeGroup'";
const EXPECTED_DISPATCH_ARM = 'case "closeGroup":';
const EXPECTED_CLOSE_CALL = 'closeGroupRows(data.id)';

/**
 * Held-out live halves (15-UI-SPEC.md close-group backstop). Flat scalars:
 * no evidence attached, so the gate reports them HELD-OUT -- never a
 * silent pass.
 */
const BACKSTOPS = Object.freeze([
    { statement: 'confirming Close Group closes exactly that group tabs and removes its box', verification: 'backstop' },
    { statement: 'cancelling the Close Group dialog changes nothing', verification: 'backstop' },
    { statement: 'activity never rests on a removed box after Close Group', verification: 'backstop' },
]);

function fail(message) {
    throw new Error(`${NAME}: FAIL -- ${message}`);
}

/** The closeGroupById method body from the widget source. */
function derivedClosePath(widgetSrc) {
    const at = widgetSrc.indexOf('async closeGroupById(');
    if (at < 0) {
        return '';
    }
    const open = widgetSrc.indexOf('{', at);
    if (open < 0) {
        return '';
    }
    let depth = 0;
    for (let i = open; i < widgetSrc.length; i += 1) {
        if (widgetSrc[i] === '{') {
            depth += 1;
        } else if (widgetSrc[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return widgetSrc.slice(at, i + 1);
            }
        }
    }
    return '';
}

/** The ConfirmDialog argument block from the close path. */
function derivedDialogBlock(closePath) {
    const at = closePath.indexOf('new ConfirmDialog({');
    if (at < 0) {
        return '';
    }
    const open = closePath.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < closePath.length; i += 1) {
        if (closePath[i] === '{') {
            depth += 1;
        } else if (closePath[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return closePath.slice(at, i + 1);
            }
        }
    }
    return '';
}

function derivedField(block, name) {
    const single = new RegExp(`${name}:\\s*'([^']+)'`).exec(block);
    if (single) {
        return single[1];
    }
    const template = new RegExp(`${name}:\\s*\`([^\`]+)\``).exec(block);
    return template ? template[1] : undefined;
}

/** @returns {string[]} failure messages -- empty means the gate holds. */
function checkStatic(sources) {
    const failures = [];
    const widgetSrc = sources[WIDGET_REL] ?? '';
    const modelSrc = sources[MODEL_REL] ?? '';
    const apiSrc = sources[API_REL] ?? '';

    // 1. Dialog copy verbatim: title, singular/plural body, both buttons.
    const closePath = derivedClosePath(widgetSrc);
    if (!closePath) {
        failures.push(`${WIDGET_REL}: 'closeGroupById' underivable -- the close anchor drifted`);
        return failures;
    }
    const dialog = derivedDialogBlock(closePath);
    if (!dialog) {
        failures.push(`${WIDGET_REL}: the ConfirmDialog block is gone from the close path -- closing without the contracted confirmation`);
    } else {
        const title = derivedField(dialog, 'title');
        const ok = derivedField(dialog, 'ok');
        const cancel = derivedField(dialog, 'cancel');
        if (title === undefined || ok === undefined || cancel === undefined) {
            failures.push(`${WIDGET_REL}: the dialog block no longer derives title/ok/cancel -- the confirmation anchor drifted`);
        } else {
            if (title !== EXPECTED_DIALOG_TITLE) {
                failures.push(`${WIDGET_REL}: dialog title is ${JSON.stringify(title)}, declared ${JSON.stringify(EXPECTED_DIALOG_TITLE)}`);
            }
            if (ok !== EXPECTED_DIALOG_OK) {
                failures.push(`${WIDGET_REL}: dialog ok is ${JSON.stringify(ok)}, declared ${JSON.stringify(EXPECTED_DIALOG_OK)}`);
            }
            if (cancel !== EXPECTED_DIALOG_CANCEL) {
                failures.push(`${WIDGET_REL}: dialog cancel is ${JSON.stringify(cancel)}, declared ${JSON.stringify(EXPECTED_DIALOG_CANCEL)}`);
            }
        }
        // The body rides a `count === 1` branch: both templates must derive
        // from the close path verbatim (set equality -- a reworded singular
        // or plural breaks its side, a lost branch breaks the pairing).
        if (!closePath.includes('`' + EXPECTED_DIALOG_MSG_ONE + '`')) {
            failures.push(`${WIDGET_REL}: dialog singular body drifted -- declared ${JSON.stringify(EXPECTED_DIALOG_MSG_ONE)}`);
        }
        if (!closePath.includes('`' + EXPECTED_DIALOG_MSG_MANY + '`')) {
            failures.push(`${WIDGET_REL}: dialog plural body drifted -- declared ${JSON.stringify(EXPECTED_DIALOG_MSG_MANY)}`);
        }
        if (!/count\s*===\s*1/.test(closePath)) {
            failures.push(`${WIDGET_REL}: no 'count === 1' branch -- the singular/plural pairing lost its selector`);
        }
    }

    // 2. Cancel path returns before any mutation: the unconfirmed return
    // sits ahead of the model close call in the same method body.
    const cancelAt = closePath.indexOf('if (!confirmed)');
    const mutateAt = closePath.indexOf('closeGroup(this.actor');
    if (cancelAt < 0) {
        failures.push(`${WIDGET_REL}: no 'if (!confirmed)' guard -- cancelling the dialog can no longer be a no-op`);
    } else if (closePath.slice(cancelAt).indexOf('return;') < 0) {
        failures.push(`${WIDGET_REL}: the unconfirmed branch never returns -- cancelling falls through toward mutation`);
    }
    if (mutateAt < 0) {
        failures.push(`${WIDGET_REL}: the close path never reaches the model close -- confirming closes nothing`);
    }
    if (cancelAt >= 0 && mutateAt >= 0 && cancelAt > mutateAt) {
        failures.push(`${WIDGET_REL}: the cancel guard sits AFTER the model close -- cancelling mutates before it can return`);
    }

    // 3. Model wiring: the closeGroup actor kind plus the activity handoff
    // to the next remaining box (never a removed one).
    if (!modelSrc.includes('async closeGroup(')) {
        failures.push(`${MODEL_REL}: 'closeGroup' underivable -- the model close anchor drifted`);
    }
    if (!modelSrc.includes(EXPECTED_CLOSE_KIND)) {
        failures.push(`${MODEL_REL}: no ${EXPECTED_CLOSE_KIND} mutate -- the model close never reaches the chrome-side close arm`);
    }
    if (!modelSrc.includes('this.groups[0]?.id')) {
        failures.push(`${MODEL_REL}: the activity handoff ('this.groups[0]?.id') is gone -- activity can rest on the removed box`);
    }

    // 4. Chrome wiring: the dispatch arm reaches the per-tab stock close
    // loop plus the row DELETEs in one surface.
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
    if (!apiSrc.includes('DELETE FROM tabs WHERE group_id')) {
        failures.push(`${API_REL}: no member-row DELETE -- closed tabs leave orphan rows`);
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
    return failures;
}

function readSources() {
    const read = rel => readFileSync(join(REPO_ROOT, rel), 'utf8');
    return {
        [WIDGET_REL]: read(WIDGET_REL),
        [MODEL_REL]: read(MODEL_REL),
        [API_REL]: read(API_REL),
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
    console.log(`${NAME}: PASS -- contracted dialog, cancel-first ordering, exact close wiring`);
    for (const backstop of BACKSTOPS) {
        console.log(`${NAME}: HELD-OUT (reserved live) -- ${backstop.statement} [verification: ${backstop.verification}]`);
    }
}

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

    // Plant 1: dialog-copy drift must go red naming the drift.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace("title: 'Close Group'", "title: 'Close group'") };
        const landed = mutated[WIDGET_REL].includes("title: 'Close group'");
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'dialog-copy drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /dialog title/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'dialog-copy drift' did not go red naming the dialog title; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  dialog-copy drift -> red, naming the dialog title`);
        }
    }

    // Plant 2: removing the chrome close call must go red naming the drift.
    {
        const mutated = { ...real, [API_REL]: real[API_REL].replace('await PowerBrowserAPI.closeGroupRows(data.id);', 'await PowerBrowserAPI.removeGroupRow(data.id);') };
        const landed = mutated[API_REL].includes('await PowerBrowserAPI.removeGroupRow(data.id);');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'wiring removal' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /closeGroupRows\(data\.id\)/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'wiring removal' did not go red naming the close call; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  wiring removal -> red, naming the close call`);
        }
    }

    // Plant 3: removing the cancel guard must go red naming the no-op loss.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace('        if (!confirmed) {\n            return;\n        }\n', '') };
        const landed = !mutated[WIDGET_REL].includes('if (!confirmed)');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'cancel-guard removal' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /!confirmed/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'cancel-guard removal' did not go red naming '!confirmed'; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  cancel-guard removal -> red, naming '!confirmed'`);
        }
    }

    // Plant 4 (WR-02): the unknown-group throw must go red naming the
    // idempotency loss.
    {
        const mutated = { ...real, [API_REL]: real[API_REL].replace('return "already-closed";', 'throw new Error(`closeGroupRows: unknown group ${id}`);') };
        const landed = mutated[API_REL].includes('closeGroupRows: unknown group');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'unknown-group throw' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /already-closed|unknown group/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'unknown-group throw' did not go red naming the idempotency loss; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  unknown-group throw -> red, naming the idempotency loss`);
        }
    }

    // Plant 5 (15-UI-REVIEW Top Fix #3): singular-body drift must go red
    // naming the singular form.
    {
        const mutated = { ...real, [WIDGET_REL]: real[WIDGET_REL].replace('Its 1 tab will close too.', 'Its 1 tabs will close too.') };
        const landed = mutated[WIDGET_REL].includes('Its 1 tabs will close too.');
        const result = checkStatic(mutated);
        if (!landed) {
            console.error(`${NAME} --self-test: FAIL -- 'singular-body drift' plant did not land`);
            failed += 1;
        } else if (!result.some(f => /singular body/.test(f))) {
            console.error(`${NAME} --self-test: FAIL -- 'singular-body drift' did not go red naming the singular body; got: ${result.join(' | ') || '(no failures at all)'}`);
            failed += 1;
        } else {
            console.log(`  ok  singular-body drift -> red, naming the singular body`);
        }
    }

    if (failed) {
        process.exit(1);
    }
    console.log(`${NAME} --self-test: PASS -- all five fault directions went red naming the drift`);
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
