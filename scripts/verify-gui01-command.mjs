#!/usr/bin/env node
// scripts/verify-gui01-command.mjs
//
// GUI-01, half one: the palette entry is REAL, not assumed.
//
// 01-UI-SPEC.md's GUI-01 contract names exactly one entry affordance -- "one
// Theia command, palette-reachable, labelled 'Open Browser Window'". A command
// contribution that compiles, is bound, and is never enumerated by the command
// registry produces precisely nothing in the palette, and nothing else in this
// repo would notice: there is no menu entry and no keybinding to fail loudly in
// its place. So this check reads the LIVE frontend's own `CommandRegistry` and
// asserts the command is in it, by the id `browser-window-command.ts` exports.
//
// It also asserts the label, because the label is the palette entry: a command
// registered without one is filtered out of Theia's quick-command palette
// (`CommandRegistry.commands` entries with no label are not offered), so "the
// id is registered" alone would still permit an unreachable command.
//
// The id and label are read out of the TypeScript source rather than duplicated
// here, so this file can never drift from what the extension actually
// registers -- the same "checked against identical wording rather than drifting
// copies" discipline `CARVE_OUTS` and docs/URI-SCHEMES.md already follow.
//
// Reflection note: identical root cause to verify-uri-roundtrip.mjs's own. BiDi
// `script.evaluate` runs a bare expression in the page's realm with no module
// resolution, so the `CommandRegistry` DI identifier VALUE is unreachable from
// here; it is resolved by walking Inversify's internal `_bindingDictionary` and
// matching the bound identifier's name. Pinned against inversify 6.2.2 -- a
// future inversify bump renaming `_bindingDictionary` breaks this file first.
//
// Usage:
//   node scripts/verify-gui01-command.mjs [url]
//   node scripts/verify-gui01-command.mjs --help
//
// No import/require of any package name -- only Node built-ins and
// scripts/lib/firefox-bidi.mjs (D-69).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withFirefoxPage } from './lib/firefox-bidi.mjs';

const HELP = `Usage: node scripts/verify-gui01-command.mjs [url]

GUI-01: asserts the "Open Browser Window" command is registered in the live
Theia frontend's CommandRegistry, with the id and label
theia/extensions/tab-uris/src/browser/browser-window-command.ts exports.

  [url]    App URL to check (default http://localhost:3000)
  --help   Print this message and exit 0
`;

const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log(HELP.trimEnd());
    process.exit(0);
}
const url = args.find(a => !a.startsWith('--')) || 'http://localhost:3000';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(REPO_ROOT, 'theia', 'extensions', 'tab-uris', 'src', 'browser', 'browser-window-command.ts');

/**
 * Reads the exported id and label straight out of the contribution's source.
 * A regex over TypeScript is a blunt instrument, but the alternative -- writing
 * the strings out a second time in this file -- is the exact drift this repo
 * refuses elsewhere, and an unparseable source is a loud failure here rather
 * than a silently weakened assertion.
 */
function expectedCommand() {
    const text = readFileSync(SOURCE, 'utf8');
    const id = /OPEN_BROWSER_WINDOW_COMMAND_ID\s*=\s*'([^']+)'/.exec(text);
    const label = /label:\s*'([^']+)'/.exec(text);
    if (!id || !label) {
        throw new Error(
            `verify-gui01-command: could not read the command id and label out of ${SOURCE}. ` +
            'This check derives them from the source on purpose; fix the reader rather than ' +
            'hardcoding the strings here.'
        );
    }
    return { id: id[1], label: label[1] };
}

const { id: EXPECTED_ID, label: EXPECTED_LABEL } = expectedCommand();

const failures = [];
const fail = message => {
    failures.push(message);
    console.error(`verify-gui01-command: FAIL -- ${message}`);
};

// `window.theia.container` exists LONG before the command registry is
// populated: Theia builds the container first and only then runs each
// FrontendApplicationContribution's onStart, which is where
// CommandRegistry.onStart() enumerates its CommandContributions. Read too
// early and the registry reports a single command -- measured live -- so
// every assertion below would fail for a timing reason and name the wrong
// cause. Waiting for the app shell to render and then for the registry to
// carry the command is the precondition; the timeout is swallowed on purpose
// so the detailed read below produces the real diagnosis rather than a
// `waitFor timed out` stack.
const REGISTRY_READY = `(() => {
    try {
        let found;
        window.theia.container._bindingDictionary.traverse((key) => {
            if (found) return;
            const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
            if (keyStr === 'CommandRegistry') found = key;
        });
        return found ? window.theia.container.get(found).commands.length > 1 : false;
    } catch (e) { return false; }
})()`;

await withFirefoxPage(url, async ({ evaluate, waitFor }) => {
    await waitFor('window.theia && window.theia.container ? true : false', { timeoutMs: 60000 });
    await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
    await waitFor(REGISTRY_READY, { timeoutMs: 60000 }).catch(() => undefined);

    const raw = await evaluate(`(() => {
        function __getByName(container, name) {
            let found;
            container._bindingDictionary.traverse((key) => {
                if (found) return;
                const keyStr = typeof key === 'symbol' ? key.toString() : (key && key.name) || String(key);
                if (keyStr === 'Symbol(' + name + ')' || keyStr === name) found = key;
            });
            if (!found) throw new Error('DI binding not found for identifier name: ' + name);
            return container.get(found);
        }
        try {
            const registry = __getByName(window.theia.container, 'CommandRegistry');
            const command = registry.getCommand(${JSON.stringify(EXPECTED_ID)});
            return JSON.stringify({
                ok: true,
                found: !!command,
                label: command ? (command.label || null) : null,
                // The palette enumerates registry.commands; being reachable by
                // getCommand() but absent from that list would still be an
                // unreachable palette entry.
                inCommandsList: registry.commands.some(c => c.id === ${JSON.stringify(EXPECTED_ID)}),
                total: registry.commands.length,
            });
        } catch (e) {
            return JSON.stringify({ ok: false, error: String(e) });
        }
    })()`);

    const result = JSON.parse(raw);
    if (!result.ok) {
        fail(`could not read the frontend's CommandRegistry: ${result.error}`);
        return;
    }
    // Non-vacuity, and specifically the failure this check hit while being
    // written: an un-started registry reports exactly ONE command (measured
    // live), so "the command is missing" and "the contributions have not been
    // enumerated yet" are indistinguishable from a bare absence. Reject the
    // second case by name instead of reporting it as the first.
    if (result.total <= 1) {
        fail(`the frontend's CommandRegistry reports ${result.total} command(s) -- its contributions were never enumerated, so this check would prove nothing about whether '${EXPECTED_ID}' is registered`);
        return;
    }
    if (!result.found) {
        fail(`command '${EXPECTED_ID}' is not registered in the frontend's CommandRegistry (${result.total} commands enumerated)`);
    }
    if (!result.inCommandsList) {
        fail(`command '${EXPECTED_ID}' is not in CommandRegistry.commands, so the command palette never offers it`);
    }
    if (result.found && result.label !== EXPECTED_LABEL) {
        fail(`command '${EXPECTED_ID}' is registered with label ${JSON.stringify(result.label)}, expected ${JSON.stringify(EXPECTED_LABEL)} (01-UI-SPEC.md's contracted string)`);
    }
});

if (failures.length) {
    console.error(`verify-gui01-command: FAIL -- ${failures.length} assertion(s) failed`);
    process.exit(1);
}
console.log(`verify-gui01-command: PASS -- '${EXPECTED_ID}' is registered and palette-reachable as "${EXPECTED_LABEL}"`);
