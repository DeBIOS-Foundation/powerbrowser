import { injectable, inject } from '@theia/core/shared/inversify';
import { OpenHandler, OpenerOptions, WidgetOpenerOptions } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { TerminalFrontendContribution } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { TabUriRegistry } from './tab-uri-registry';
import { terminalIdentityOptions } from './terminal-naming-contribution';

/**
 * The `terminal:` `OpenHandler` (D-44's sibling for the one multi-instance
 * scheme). A **bare** `OpenHandler`, not `WidgetOpenHandler` -- deliberate
 * deviation from the plan's own comparison to
 * `VSXExtensionEditorManager`: `WidgetOpenHandler.doOpen` defaults an
 * unattached widget's area to `'main'`
 * (`widget-open-handler.ts`: `op.widgetOptions || { area: 'main' }`), which
 * is correct for an extension detail editor (a `'main'`-area tab already)
 * but wrong for Terminal, whose real default area is `'bottom'`
 * (`terminal-shell-handler.ts`: `terminal.location === Editor ? 'main' :
 * 'bottom'`). Delegating to `TerminalFrontendContribution.open()` instead
 * reuses Theia's own already-correct placement logic (D-46: "Theia
 * supplies ... correct panel placement") rather than reintroducing a
 * placement bug `WidgetOpenHandler`'s generic default would cause. Its
 * `open()` also already guards `!terminal.isAttached`, so calling it on an
 * already-open widget only activates (focuses) it and creates nothing --
 * `WidgetOpenHandler`'s single factory-keyed `getOrCreateWidget` also
 * cannot express D-48's empty-path "the active terminal, whichever it is"
 * case, which is not a stable identity to key widget creation on.
 */
@injectable()
export class TerminalUriOpenHandler implements OpenHandler {

    readonly id = 'powerbrowser.terminal-uri-open-handler';

    @inject(TabUriRegistry)
    protected readonly registry: TabUriRegistry;

    @inject(TerminalFrontendContribution)
    protected readonly terminalContribution: TerminalFrontendContribution;

    // 1000 or 0, synchronously, on scheme alone -- same D-45 rule as
    // ViewUriOpenHandler.
    canHandle(uri: URI): number {
        return uri.scheme === 'terminal' ? 1000 : 0;
    }

    async open(uri: URI, options?: OpenerOptions): Promise<TerminalWidget> {
        const name = this.registry.parseName(uri);

        // D-48: a non-empty path is a short lowercase name that IS the
        // instance identity, resolved through the widget manager keyed on
        // the terminal factory id with the name as the creation token. An
        // empty path means the active terminal.
        let widget = name ? this.terminalContribution.getById(name) : this.terminalContribution.currentTerminal;

        if (!widget) {
            // D-48: a stale name -- or no terminal at all for an empty
            // path -- creates a fresh shell under that name rather than
            // erroring. `terminalIdentityOptions` is the same helper
            // `PowerBrowserTerminalFrontendContribution` uses when it mints a
            // name itself, so a widget created here and one created via
            // the "new terminal" command carry the identical
            // `{created, id, title}` shape -- required for
            // `WidgetManager`'s dedup key to ever agree with a later
            // `terminal:<name>` open.
            widget = await this.terminalContribution.newTerminal(name ? terminalIdentityOptions(name) : {});
            widget.start();
        }

        // `open()` guards `!terminal.isAttached` internally, so calling it
        // on an already-open widget only activates (focuses) it and
        // creates nothing -- exactly D-48's "focuses it and creates
        // nothing" for an existing address.
        await this.terminalContribution.open(widget, options as WidgetOpenerOptions | undefined);
        return widget;
    }
}
