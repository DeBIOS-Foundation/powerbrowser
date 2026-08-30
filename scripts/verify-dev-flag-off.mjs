#!/usr/bin/env node
// scripts/verify-dev-flag-off.mjs
//
// CUST-02 proof, with a positive control (RESEARCH.md "Assumptions Log" A1):
// asserts `window.theia.container.isBound(Symbol.for('PowerBrowserPrivilegedJs'))`
// evaluated IN THE RUNNING PAGE, against a release-configured `theia build`
// artifact -- never against `theia/applications/browser/src-gen/`.
//
// Two vacuous-pass modes this script must avoid (D-64, 02-VALIDATION.md
// "Known Validation Risks"):
//   1. Running against `src-gen` rather than `lib` -- the backend prefers
//      `lib/backend/main.js` and serves `lib/frontend`, so a hand-edited
//      `src-gen` proves nothing about what actually ships. Point this script
//      at an app started from a `theia build` artifact.
//   2. Grepping source instead of evaluating in the page -- this script only
//      ever asserts against the live DI container over WebDriver BiDi.
//
// D-65's caveat, restated here so it is not "discovered" at verification:
// this asserts binding ABSENCE, not artifact absence -- the
// PowerBrowserPrivilegedJs class remains in bundle.js (tree-shaking cannot
// remove code behind a runtime config read). CUST-02 as worded ("no
// privileged binding exists at runtime") is satisfied by binding absence,
// which is exactly what this script checks.
//
// Default mode asserts the binding is ABSENT (exit 0 when isBound() ===
// false). `--expect-bound` inverts the assertion (exit 0 when isBound() ===
// true) -- the positive control the Assumptions Log demands: a script that
// can only ever report "not bound" would pass vacuously against an app that
// never defined the token at all. D-69 exercised both branches live and got
// `false` for the absent token, `true` for a present one.
//
// Current expected state (until Plan 05 lands `@powerbrowser/customize`):
// default mode returns false and passes -- for the right reason once the
// extension exists, for the trivial reason (the token was never registered
// at all) until then. `--expect-bound` is what catches that gap; Plan 05
// must run it.
//
// Usage:
//   node scripts/verify-dev-flag-off.mjs [url] [--expect-bound]
//   node scripts/verify-dev-flag-off.mjs --help
//
// No import/require of any package name -- only Node built-ins and
// scripts/lib/firefox-bidi.mjs (D-69: zero test dependencies).

import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const HELP = `Usage: node scripts/verify-dev-flag-off.mjs [url] [--expect-bound]

Asserts window.theia.container.isBound(Symbol.for('PowerBrowserPrivilegedJs'))
in the running page. Default mode expects false (dev flag off); --expect-bound
inverts the assertion (positive control).

  [url]            App URL to check (default http://localhost:3000)
  --expect-bound   Assert the binding is PRESENT instead of absent
  --help           Print this message and exit 0
`;

const args = process.argv.slice(2);

if (args.includes('--help')) {
    console.log(HELP.trimEnd());
    process.exit(0);
}

const expectBound = args.includes('--expect-bound');
const url = args.find(a => !a.startsWith('--')) || 'http://localhost:3000';

const CHECK_BINDING = "window.theia.container.isBound(Symbol.for('PowerBrowserPrivilegedJs'))";

async function main() {
    return withFirefoxPage(url, async ({ evaluate, waitFor }) => {
        await waitFor('window.theia && window.theia.container ? true : false');
        const isBound = await evaluate(CHECK_BINDING);
        return isBound;
    });
}

main()
    .then(isBound => {
        if (expectBound) {
            if (isBound === true) {
                console.log('verify-dev-flag-off: PASS -- expect-bound, isBound() is true');
                process.exit(0);
            }
            console.error(`verify-dev-flag-off: FAIL -- expected PowerBrowserPrivilegedJs to be bound, isBound() returned ${JSON.stringify(isBound)}`);
            process.exit(1);
        }
        if (isBound === false) {
            console.log('verify-dev-flag-off: PASS');
            process.exit(0);
        }
        console.error('verify-dev-flag-off: FAIL -- PowerBrowserPrivilegedJs is bound with the dev flag off');
        process.exit(1);
    })
    .catch(err => {
        console.error(`verify-dev-flag-off: FAIL -- ${err.message}`);
        process.exit(1);
    });
