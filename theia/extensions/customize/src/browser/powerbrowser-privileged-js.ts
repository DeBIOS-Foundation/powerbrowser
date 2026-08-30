import { interfaces } from '@theia/core/shared/inversify';
import { ApplicationShell } from '@theia/core/lib/browser';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';

// CUST-02's build-time gate (D-62..D-67). The DI token MUST use the global
// symbol registry (`Symbol.for`), not a bare `Symbol()`: a bare symbol is a
// unique value unreachable from any out-of-bundle evaluation context --
// including the WebDriver BiDi `script.evaluate` callback
// `scripts/verify-dev-flag-off.mjs` runs the CUST-02 proof from -- which
// would make the proof structurally incapable of ever reporting anything
// but "unbound". The string key below must match that script exactly.
export const PowerBrowserPrivilegedJs = Symbol.for('PowerBrowserPrivilegedJs');

// The small, stable surface `customize.js` receives when the dev flag is
// on (D-67). `tabUriRegistry` is now wired from `@powerbrowser/tab-uris`
// (Plan 06) -- see 02-05-SUMMARY.md's Known Stubs for the gap this closes.
// The property stays optional (`| undefined`, not a hard-required field):
// `CustomizePrivilegedJsContribution` populates it only when
// `TabUriRegistry` is actually bound in the running container, so
// `@powerbrowser/customize` keeps compiling and running standalone if the
// registry is ever absent from a composition -- no hard dependency that
// would break the dev-flag-off path.
export interface PowerBrowserPrivilegedJsSurface {
    readonly container: interfaces.Container;
    readonly shell: ApplicationShell;
    readonly tabUriRegistry: TabUriRegistry | undefined;
}
