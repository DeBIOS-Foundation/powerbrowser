import { interfaces } from '@theia/core/shared/inversify';
import { ApplicationShell, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { UserStorageUri } from '@theia/userstorage/lib/browser/user-storage-uri';
import { TabUriRegistry } from '@sourcerer/tab-uris/lib/browser/tab-uri-registry';
import { SourcererPrivilegedJsSurface } from './sourcerer-privileged-js';

// The privileged JS layer (D-62..D-67, CUST-02). Only ever bound when
// `theia.frontend.config.sourcererPrivilegedJs` is `true` at build time --
// see the guarded `if` in customize-frontend-module.ts, which is what makes
// CUST-02's "the binding does not exist" claim true rather than a runtime
// no-op guard sitting on top of an always-present binding.
//
// Any URI scheme this layer's user script registers must go through
// `DefaultOpenerService.addHandler()`, which returns a `Disposable` -- a
// late `bind(OpenHandler)` is permanently invisible because
// `ContributionProvider` caches its array on first call and drops its
// container reference (D-50).
export class CustomizePrivilegedJsContribution implements FrontendApplicationContribution {

    constructor(
        protected readonly fileService: FileService,
        protected readonly shell: ApplicationShell,
        protected readonly container: interfaces.Container,
        // Undefined when @sourcerer/tab-uris's TabUriRegistry is not bound
        // in this container -- see sourcerer-privileged-js.ts's header.
        protected readonly tabUriRegistry: TabUriRegistry | undefined,
    ) { }

    // `onDidInitializeLayout`, not `onStart`: this only ever needs the
    // shell to exist (D-67's surface includes it), and -- as
    // `customize-css-contribution.ts`'s header documents at length --
    // awaiting a `user-storage:` read inside a lifecycle hook that
    // `startContributions()`/layout-init itself awaits deadlocks against
    // the RPC connection those reads need. This method must never be
    // `async`; the real work is fired off without being awaited.
    onDidInitializeLayout(): void {
        this.run();
    }

    protected async run(): Promise<void> {
        const uri = UserStorageUri.resolve('customize.js');
        let source: string;
        try {
            source = (await this.fileService.read(uri)).value;
        } catch {
            // Absent or unreadable -- never created, nothing executes.
            return;
        }
        if (!source) {
            return;
        }

        const surface: SourcererPrivilegedJsSurface = {
            container: this.container,
            shell: this.shell,
            tabUriRegistry: this.tabUriRegistry,
        };

        try {
            // eslint-disable-next-line no-new-func
            const run = new Function('sourcerer', source);
            run(surface);
        } catch (error) {
            // A throwing user script is reported, never fatal to the
            // frontend -- startup has already completed by the time this
            // runs, and the shell must stay attached regardless.
            console.error('[@sourcerer/customize] customize.js threw during execution:', error);
        }
    }
}
