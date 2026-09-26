#!/usr/bin/env node
// scripts/verify-ng-074-ci-main.mjs -- NG-074 (wave E): the CI verify workflow passes on main.
// Asks GitHub (gh) for the .github/workflows/verify.yml runs on the commit local `main`
// points at, and requires one completed with conclusion success. --self-test runs the
// verdict over planted run sets.
// Tier: full (network, gh auth); the self-test is quick. Marker: live-main -- green only
// after main is pushed (Chris).
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'ng074-ci-green-on-main';

export function verdict(runs, sha) {
    const mine = runs.filter(r => r.headSha === sha);
    if (mine.length === 0) return `no verify.yml run exists for main at ${sha} -- push main (Chris) and wait for the run`;
    const done = mine.filter(r => r.status === 'completed');
    if (done.length === 0) return `the verify.yml run for ${sha} has not completed`;
    if (!done.some(r => r.conclusion === 'success')) return `the verify.yml run for ${sha} concluded ${done.map(r => r.conclusion).join(', ')} -- read it: gh run view <id> --log-failed`;
    return null;
}

if (process.argv.includes('--self-test')) {
    const sha = 'a'.repeat(40);
    const cases = [
        ['no run', [], true],
        ['other commit only', [{ headSha: 'b'.repeat(40), status: 'completed', conclusion: 'success' }], true],
        ['in progress', [{ headSha: sha, status: 'in_progress', conclusion: '' }], true],
        ['failed', [{ headSha: sha, status: 'completed', conclusion: 'failure' }], true],
        ['green', [{ headSha: sha, status: 'completed', conclusion: 'success' }], false],
    ];
    const wrong = cases.filter(([, runs, red]) => (verdict(runs, sha) !== null) !== red).map(([l]) => l);
    if (wrong.length) { console.error(`${NAME} --self-test: FAIL -- wrong verdict for: ${wrong.join(', ')}`); process.exit(1); }
    console.log(`${NAME} --self-test: PASS -- every planted run set gave the expected verdict`);
} else {
    const sha = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();
    const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--workflow', 'verify.yml', '--branch', 'main', '--commit', sha,
        '--json', 'headSha,status,conclusion', '--limit', '20'], { cwd: REPO_ROOT, encoding: 'utf8' }));
    const v = verdict(runs, sha);
    if (v) { console.error(`${NAME}: FAIL -- ${v}`); process.exit(1); }
    console.log(`${NAME}: PASS -- verify.yml concluded success on main at ${sha}`);
}
