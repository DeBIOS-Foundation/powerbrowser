import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChangeType } from '@theia/filesystem/lib/common/files';
import { UserStorageUri } from '@theia/userstorage/lib/browser/user-storage-uri';
import pDebounce from 'p-debounce';

// R4a's user CSS layer -- see 02-CONTEXT.md D-54/D-57/D-58/D-59/D-60/D-61
// for the full rationale; summarized here so a future reader does not have
// to cross-reference:
//
// - File: `$THEIA_CONFIG_DIR/customize.css`, addressed from the frontend as
//   `user-storage:/user/customize.css` via `UserStorageUri.resolve(...)`
//   (D-54) -- next to `settings.json`/`keymaps.json`, outside every
//   workspace.
// - Read: `(await fileService.read(uri)).value` with a `.catch()` (D-57).
//   No backend contribution, no express route, no static-file serving is
//   added -- the frontend's file provider already proxies the backend's
//   disk provider with no root restriction. This is PRE-EXISTING REACH: the
//   workspace was never a sandbox, and this file's location is not a
//   security boundary.
// - Injection: a bare `document.createElement('style')` with the file's
//   literal bytes in `textContent`, nothing else (D-58). Not
//   `DecorationStyle.createStyleElement` -- it hard-sets `media='screen'`,
//   silently excluding print. Not `createStyleSheet` + `insertRule` --
//   `textContent` lets the browser's parser drop invalid rules silently
//   instead of throwing on malformed user input. Not a `<link>` -- a miss
//   404s through express's default handler with a `text/html` body, which
//   the browser refuses to apply as a stylesheet.
// - Cascade order (D-59): `onStart` runs after every core style
//   contribution and before the shell is attached
//   (`FrontendApplication.start()` awaits `startContributions()` before
//   `attachShell(host)`), so the layer is present on first paint with no
//   flash. Monaco's `<style class="monaco-colors">` and each terminal's
//   `<style id="<id>-terminal-style">` are injected later in the session;
//   `replaceStyleElement` re-asserts last position on every reload by
//   appending the fresh element before removing the old one -- the same
//   dispose-and-re-append idiom `PluginSharedStyle.update()` uses.
// - Hot reload (D-60): subscribes to `fileService.onDidFilesChange` --
//   no watcher of our own. `UserStorageContribution.createProvider`
//   already holds a recursive watch on the whole config dir, activated at
//   startup by `@theia/preferences`. One physical save can surface as two
//   change events under two different provider schemes (`file:` from the
//   disk provider, `user-storage:` remapped by the delegating provider);
//   `event.contains(this.uri)` does an exact `URI#toString()` match
//   (`files.ts` `FileChangesEvent.contains`), and `this.uri` is always the
//   `user-storage:` scheme, so a `file:`-scheme duplicate never matches --
//   filtering to one scheme falls out of always comparing against the same
//   single-scheme URI, with no separate branch needed. The ~150ms debounce
//   absorbs same-scheme duplicate notifications a single truncate-then-write
//   or atomic-rename save can still produce.
// - Never create the file (D-61): absence is the untouched default, and an
//   empty `<style></style>` in head has provably zero effect -- keeping it
//   that way is the entire CUST-01 guarantee.
// - Boot-chain note: `UserStorageContribution.createProvider()` awaits
//   `EnvVariablesServer.getConfigDirUri()`, a backend RPC that needs the
//   frontend connection which comes up around/after `startContributions()`
//   completes. Awaiting the `user-storage:` read *inside* `onStart()` --
//   which `startContributions()` itself awaits -- is a boot-chain deadlock,
//   not a broken activation: the read resolves fine once it is off that
//   blocking path (confirmed live: `UserConfigsPreferenceProvider` reads
//   `user-storage:/settings.json` successfully during the same boot,
//   because its own read is never awaited inside `onStart()`). So `onStart`
//   applies an empty layer synchronously (first paint, D-59) and returns
//   immediately; the real read runs after, unblocked.
@injectable()
export class CustomizeCssContribution implements FrontendApplicationContribution {

    @inject(FileService)
    protected readonly fileService: FileService;

    protected readonly uri = UserStorageUri.resolve('customize.css');
    protected styleElement?: HTMLStyleElement;
    protected lastGoodContent = '';
    // Whether `applyCss()` has completed at least one real read attempt
    // (success, or a definitive first-time absence) -- distinct from
    // whether a DOM placeholder already exists (it always does, from the
    // synchronous call in `onStart`).
    protected hasReadOnce = false;
    protected readonly debouncedApply = pDebounce(() => this.applyCss(), 150);

    onStart(): void {
        // Synchronous, empty -- present on first paint (D-59) with no wait
        // on any file I/O. Never create the file; this is just the DOM
        // anchor `replaceStyleElement` re-asserts on every later reload.
        this.replaceStyleElement('');
        // Fire-and-forget: must not be awaited here, or this contribution
        // re-enters the boot-chain deadlock described above.
        this.applyCss();
        this.fileService.onDidFilesChange(event => {
            // A DELETED change is a deliberate, unambiguous absence -- reset
            // immediately, bypassing the "keep last good content" guard in
            // `applyCss()`'s catch branch (D-60's guard is for a mid-save
            // truncate/rename read racing an UPDATED event, not for the user
            // actually removing the file).
            if (event.contains(this.uri, FileChangeType.DELETED)) {
                this.lastGoodContent = '';
                this.replaceStyleElement('');
                return;
            }
            if (event.contains(this.uri)) {
                this.debouncedApply();
            }
        });
    }

    protected async applyCss(): Promise<void> {
        let content: string;
        try {
            content = (await this.fileService.read(this.uri)).value;
            this.lastGoodContent = content;
        } catch {
            if (!this.hasReadOnce) {
                // First-ever read: absent or unreadable is the untouched
                // default -- empty, never created (D-57/D-61).
                content = '';
                this.lastGoodContent = '';
            } else {
                // A later read failure -- editors save by truncate-then-write
                // or atomic rename, so a mid-save read can legitimately
                // return empty/partial content. Keep the previously applied
                // styling in place rather than blanking it (D-60): leave the
                // DOM untouched and return without replacing the element.
                return;
            }
        }
        this.hasReadOnce = true;
        this.replaceStyleElement(content);
    }

    protected replaceStyleElement(content: string): void {
        const previous = this.styleElement;
        const style = document.createElement('style');
        style.textContent = content;
        document.head.appendChild(style);
        this.styleElement = style;
        // Append the fresh element before removing the old one -- no frame
        // with zero style applied, and the fresh append always lands last
        // in `document.head`, re-asserting position past anything injected
        // since the previous reload.
        if (previous) {
            previous.remove();
        }
    }
}
