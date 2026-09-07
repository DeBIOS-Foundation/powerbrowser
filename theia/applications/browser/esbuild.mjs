/**
 * This file can be edited to adjust the ESBuild build process.
 * To reset, delete this file and rerun theia build again.
 *
 * TRACKED ON PURPOSE (14.1-03). `theia build` writes this file only when it
 * is absent, so it is the one build-configuration seam the app owns; the
 * gen-esbuild.*.mjs files beside it are regenerated on every build and
 * cannot carry a change.
 *
 * `better-sqlite3` must stay OUT of the backend bundle. Bundled, its JS
 * wrapper resolves the native binding relative to the bundle directory --
 * `lib/build/Release/better_sqlite3.node`, a path nothing ever creates --
 * so `new Database(...)` threw on every launch and the readonly tab-row
 * reader (TabQueryService, SQL-04) swallowed the throw and served [] to the
 * address pill's suggestions and to Panorama, silently. Measured live by
 * scripts/verify-web-tab-live.mjs (the first check to read the store
 * through the running backend). As an external, the bundle keeps a runtime
 * `require('better-sqlite3')` that resolves the real package, whose own
 * binding lookup works. The generator hard-codes its nativeBindings table
 * (drivelist only) and reads no package.json key for it, which is why this
 * lives here and not in package.json.
 */
import { browserOptions, watch } from './gen-esbuild.browser.mjs';
import { nodeOptions } from './gen-esbuild.node.mjs';

import esbuild from 'esbuild';

nodeOptions.external = [...(nodeOptions.external ?? []), 'better-sqlite3'];

const browserContext = await esbuild.context(browserOptions);
const nodeContext = await esbuild.context(nodeOptions);


if (watch) {
    await Promise.all([
        browserContext.watch(),
        nodeContext.watch(),
    ]);
} else {
    try {
        await browserContext.rebuild();
        await browserContext.dispose();
        await nodeContext.rebuild();
        await nodeContext.dispose();
    } catch {
        process.exit(1);
    }
}
