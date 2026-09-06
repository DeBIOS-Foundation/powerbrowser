#!/usr/bin/env node
/**
 * GUI-07's spike-verdict gate (13-02): the strip-relocation verdict recorded
 * in `13-SPIKE-STRIP-RELOCATION.md` parses as a one-line GREEN or RED with a
 * cause on RED, routes Phase 14 to a Variant, and its zero-core pillar
 * agrees with the ratified instrument -- mechanically, not by prose trust.
 *
 * What it asserts, in order:
 *
 *  1. Exactly one `**Verdict: GREEN**` / `**Verdict: RED**` line derives
 *     from the record. Zero is a malformed verdict; more than one is
 *     ambiguous. Either fails as a broken instrument would -- loudly,
 *     naming the drift.
 *  2. On RED, the verdict line carries a cause (non-empty text after the
 *     dash). A bare RED with no cause explains nothing and fails.
 *  3. The record routes to a Variant: RED requires a `Variant A` fallback
 *     routing, GREEN requires `Variant B`. A verdict whose routing points
 *     the other way fails naming the expected Variant.
 *  4. The core-diff pillar: the verdict's claim about Theia-core
 *     modification is checked against `scripts/diff-theia-core.sh --quick`
 *     itself (invoked, never reimplemented -- a second implementation of
 *     the instrument would drift from the first). GREEN claims zero-core
 *     proven, so the instrument must exit clean. RED with a core cause
 *     (the cause names the core instrument) claims the pillar is unproven
 *     by that instrument, so the instrument must exit red AND the record
 *     must paste its output as proof -- a RED whose instrument is actually
 *     green is a stale verdict forcing a re-probe, and fails naming it.
 *     RED with a non-core cause only requires the cause text (rule 2); the
 *     instrument result is reported, not asserted.
 *  5. `git -C upstream diff` is empty -- the spike touched no Gecko.
 *  6. The spike plan (13-01) shipped no file under `theia/` or `scripts/`:
 *     derived at check time from the commits the plan actually made
 *     (`git log --grep="13-01"`), every added path under those roots fails
 *     naming the file. Non-vacuity: zero 13-01 commits fails as a broken
 *     instrument (the spike record commit must exist to be audited).
 *
 * On the RED-with-core-cause tree this phase ships, rules 4-6 hold because
 * the drift is pre-existing install state (13-01 proofs), the upstream diff
 * is empty, and the spike committed only its record -- the gate is green on
 * a RED verdict by asserting the RED is real and documented, not by
 * asserting a GREEN that does not exist.
 *
 * Honestly --quick: reads text files, runs git plumbing plus the core-diff
 * instrument through the theia shell (seconds, like the tab-uris-typecheck
 * row). No build, no browser, no display, no network.
 *
 * Usage:
 *   node scripts/verify-strip-spike-verdict.mjs
 *   node scripts/verify-strip-spike-verdict.mjs --self-test
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-strip-spike-verdict';

const RECORD_REL = '.planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md';
const CORE_DIFF_REL = 'scripts/diff-theia-core.sh';

/** Exactly one verdict line; zero or several is a malformed record. */
function parseVerdict(record) {
    const lines = record.split('\n').filter(line => /\*\*Verdict:\s*(GREEN|RED)\*\*/.test(line));
    return lines;
}

function verdictOf(line) {
    return /\*\*Verdict:\s*GREEN\*\*/.test(line) ? 'GREEN' : 'RED';
}

/** A RED verdict must carry its cause on the same line, after a dash. */
function causeOf(line) {
    const match = /\*\*Verdict:\s*(?:GREEN|RED)\*\*\s*[—–-]\s*(.+)/.exec(line.trim());
    return match ? match[1].trim() : '';
}

/** The verdict's core claim names the core instrument. */
function hasCoreCause(record, verdictLine) {
    return /diff-theia-core|zero-core|core-diff|core modification/i.test(`${verdictLine}\n${record}`);
}

/** Exit code of the ratified zero-core instrument (never reimplemented). */
function coreDiffExit() {
    try {
        execFileSync('nix', ['develop', '.#theia', '--command', `bash ${CORE_DIFF_REL} --quick`], {
            cwd: REPO_ROOT,
            stdio: 'pipe',
            timeout: 120000,
        });
        return 0;
    } catch (error) {
        return typeof error.status === 'number' ? error.status : 1;
    }
}

function upstreamClean() {
    try {
        execFileSync('git', ['-C', 'upstream', 'diff', '--quiet'], { cwd: REPO_ROOT, stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Tracked paths the spike plan added under the shipped roots. Derived from
 * the plan's own commits, never a hand-kept list.
 */
function spikeAddedPaths() {
    let commits;
    try {
        commits = execFileSync('git', ['log', '--format=%H', '--grep=13-01'], { cwd: REPO_ROOT, encoding: 'utf8' })
            .split('\n').map(s => s.trim()).filter(Boolean);
    } catch {
        return { error: 'git log --grep=13-01 failed -- the spike-commit derivation proves nothing' };
    }
    if (commits.length === 0) {
        return { error: 'derived ZERO 13-01 commits -- the spike record commit must exist to be audited, so this comparison proves nothing' };
    }
    const added = [];
    for (const commit of commits) {
        const names = execFileSync('git', ['show', '--diff-filter=A', '--name-only', '--pretty=format:', commit], {
            cwd: REPO_ROOT,
            encoding: 'utf8',
        }).split('\n').map(s => s.trim()).filter(Boolean);
        for (const name of names) {
            if (name.startsWith('theia/') || name.startsWith('scripts/')) {
                added.push(`${name} (added in ${commit.slice(0, 7)})`);
            }
        }
    }
    return { added };
}

/**
 * @returns {{failures: string[], verdict: string|null}} failure messages --
 * empty means the verdict gate holds.
 */
function checkVerdict(record, instruments) {
    const failures = [];
    const verdictLines = parseVerdict(record);
    if (verdictLines.length === 0) {
        failures.push(`${RECORD_REL}: derived ZERO verdict lines -- no '**Verdict: GREEN**' or '**Verdict: RED**' line exists, so the gate proves nothing`);
        return { failures, verdict: null };
    }
    if (verdictLines.length > 1) {
        failures.push(`${RECORD_REL}: derived ${verdictLines.length} verdict lines -- exactly one verdict must exist, an ambiguous record proves nothing`);
        return { failures, verdict: null };
    }
    const verdictLine = verdictLines[0];
    const verdict = verdictOf(verdictLine);

    if (verdict === 'RED' && !causeOf(verdictLine)) {
        failures.push(`${RECORD_REL}: RED verdict carries no cause on the verdict line -- a bare RED explains nothing`);
    }
    if (verdict === 'RED' && !record.includes('Variant A')) {
        failures.push(`${RECORD_REL}: RED verdict does not route to Variant A -- the fallback decision is missing`);
    }
    if (verdict === 'GREEN' && !record.includes('Variant B')) {
        failures.push(`${RECORD_REL}: GREEN verdict does not route to Variant B -- the strip-work decision is missing`);
    }

    if (verdict === 'GREEN') {
        if (instruments.coreDiffExit !== 0) {
            failures.push(`${RECORD_REL}: verdict claims GREEN but the core-diff instrument is red (exit ${instruments.coreDiffExit}) -- zero-core modification is unproven; re-probe or re-record`);
        }
    } else if (hasCoreCause(record, verdictLine)) {
        // RED whose cause names the core instrument: the instrument must be
        // genuinely red (a green instrument under a core-cause RED is a
        // stale verdict) and the record must paste its output as proof.
        if (instruments.coreDiffExit === 0) {
            failures.push(`${RECORD_REL}: RED verdict blames the core-diff instrument, but the instrument is green now -- the verdict is stale; realign and re-probe, then re-record`);
        } else if (!record.includes('diff-theia-core') || !/FAIL/.test(record)) {
            failures.push(`${RECORD_REL}: RED verdict blames the core-diff instrument but pastes no FAIL output -- the blocking cause is asserted, not proven`);
        }
    }

    if (!instruments.upstreamClean) {
        failures.push('upstream diff is NOT empty -- the spike touched Gecko outside the patch stack');
    }
    const shipped = spikeAddedPaths();
    if (shipped.error) {
        failures.push(`${RECORD_REL}: ${shipped.error}`);
    } else if (shipped.added.length) {
        failures.push(`spike plan shipped files under theia/ or scripts/: ${shipped.added.join(', ')} -- the probe promised no shipped-tree change`);
    }

    return { failures, verdict };
}

function main() {
    if (process.argv.includes('--self-test')) {
        return selfTest();
    }
    const record = readFileSync(join(REPO_ROOT, RECORD_REL), 'utf8');
    const { failures } = checkVerdict(record, { coreDiffExit: coreDiffExit(), upstreamClean: upstreamClean() });
    if (failures.length) {
        console.error(`${NAME}: FAIL`);
        failures.forEach(f => console.error(`  - ${f}`));
        return 1;
    }
    console.log(`${NAME}: PASS -- spike verdict parses (GREEN or RED+cause), routes to a Variant, and agrees with the core-diff instrument, an empty upstream diff, and a clean shipped tree`);
    return 0;
}

function selfTest() {
    const record = readFileSync(join(REPO_ROOT, RECORD_REL), 'utf8');
    const instruments = { coreDiffExit: coreDiffExit(), upstreamClean: upstreamClean() };
    const baseline = checkVerdict(record, instruments);
    if (baseline.failures.length !== 0) {
        console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
        baseline.failures.forEach(f => console.error(`  ${f}`));
        return 1;
    }

    const cases = [
        {
            name: 'malformed verdict',
            mutate: text => text.replace(/\*\*Verdict:\s*(GREEN|RED)\*\*/g, '**Outcome: UNKNOWN**'),
            expect: 'ZERO verdict lines',
        },
        {
            // The record's proofs document a red instrument; flipping the
            // verdict to GREEN while keeping that body must go red. On a
            // tree where the instrument is red it names GREEN against the
            // core-diff pillar; on a realigned tree it names the Variant-B
            // routing the flipped line no longer carries.
            name: 'GREEN-with-dirty-core',
            mutate: text => text.replace('**Verdict: RED**', '**Verdict: GREEN**'),
            expect: null,
            expectAny: ['GREEN', 'Variant B'],
        },
    ];

    let failed = 0;
    for (const testCase of cases) {
        const mutated = testCase.mutate(record);
        // A planted fault that does not change the record at all would make
        // the case vacuous -- assert the mutation actually landed.
        if (mutated === record) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not modify the record; the anchor it edits has drifted`);
            failed++;
            continue;
        }
        const { failures } = checkVerdict(mutated, instruments);
        const wants = testCase.expect ? [testCase.expect] : testCase.expectAny;
        if (!failures.some(f => wants.some(w => f.includes(w)))) {
            console.error(`${NAME} --self-test: FAIL -- '${testCase.name}' did not go red naming '${wants.join("' or '")}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
            failed++;
        } else {
            console.log(`  ok  ${testCase.name} -> red, naming '${wants.join("' or '")}'`);
        }
    }

    if (failed) {
        return 1;
    }
    console.log(`${NAME} --self-test: PASS -- ${cases.length} planted faults all went red`);
    return 0;
}

process.exit(main());
