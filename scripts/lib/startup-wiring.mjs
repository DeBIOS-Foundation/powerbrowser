// scripts/lib/startup-wiring.mjs
//
// The question the SQL-store absence instrument asks before its live drive:
// is the chrome-side tab store wired into startup? Shared so NG-020's check
// can put the same question to a planted source. `sources` maps a
// repo-relative path to its text; the default reads the two startup callers.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const WIRING_CALLERS = ['powerbrowser/shell/powerbrowser.js', 'powerbrowser/shell/TheiaService.sys.mjs'];

export function readWiringSources() {
    const sources = {};
    for (const file of WIRING_CALLERS) {
        try {
            sources[file] = readFileSync(join(REPO_ROOT, file), 'utf8');
        } catch {
            // A missing caller file is itself absent wiring.
        }
    }
    return sources;
}

export function startupWiringPresent(sources = readWiringSources()) {
    return Object.values(sources).some(src => /startTabStoreTriggers|ensureTabStore/.test(src));
}
