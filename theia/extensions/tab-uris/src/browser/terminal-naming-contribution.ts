import { injectable } from '@theia/core/shared/inversify';
import { Navigatable } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { TerminalFrontendContribution } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalWidgetOptions, TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import {
    TerminalWidgetImpl, TerminalWidgetFactoryOptions, TERMINAL_WIDGET_FACTORY_ID
} from '@theia/terminal/lib/browser/terminal-widget-impl';

/**
 * D-47: terminal identity. Names are `t<n>`, minted only when the caller
 * supplied neither `created` nor `id` for a new terminal -- a
 * caller-supplied identity is never overridden.
 */
export const TERMINAL_NAME_PATTERN = /^t(\d+)$/;

/**
 * The exact options shape both the auto-mint path below and
 * `terminal-open-handler.ts`'s stale-name "create a fresh shell under that
 * name" path (D-48) must use. `WidgetManager` dedups on
 * `stableJsonStringify({factoryId, options})` (verified in
 * `widget-manager.ts`), so any drift between the two call sites would fork
 * a duplicate widget instead of resolving to the terminal a human typed.
 */
export function terminalIdentityOptions(name: string): TerminalWidgetOptions & Pick<TerminalWidgetFactoryOptions, 'created'> {
    return { created: name, id: name, title: name };
}

/**
 * Mints `t<n>` identities for terminals the caller did not already name.
 * Needs no core change: `TerminalFrontendContribution.newTerminal` spreads
 * caller options *after* the token it mints
 * (`{ created: nextTerminalCreationToken(), ...options }`), so a
 * caller-supplied value already wins -- this subclass only has to supply
 * one when neither `created` nor `id` is present. Both injected fields
 * land in the persisted `constructionOptions` and replay verbatim on
 * restore, which is what makes the address survive a reload (D-47).
 */
@injectable()
export class SourcererTerminalFrontendContribution extends TerminalFrontendContribution {

    override async newTerminal(options: TerminalWidgetOptions): Promise<TerminalWidget> {
        const asFactoryOptions = options as Partial<TerminalWidgetFactoryOptions>;
        if (asFactoryOptions.created === undefined && asFactoryOptions.id === undefined) {
            options = { ...options, ...terminalIdentityOptions(this.allocateName()) };
        }
        return super.newTerminal(options);
    }

    /**
     * Lowest unused `t<n>` index, scanning currently-created terminal
     * widgets. A restored layout's names are never reused: Theia recreates
     * every persisted widget during layout restore, before a user can ever
     * reach the "new terminal" command that calls this.
     */
    protected allocateName(): string {
        const used = new Set<number>();
        for (const widget of this.widgetManager.getWidgets(TERMINAL_WIDGET_FACTORY_ID)) {
            const match = TERMINAL_NAME_PATTERN.exec(widget.id);
            if (match) {
                used.add(Number(match[1]));
            }
        }
        let n = 1;
        while (used.has(n)) {
            n++;
        }
        return `t${n}`;
    }
}

/**
 * D-38: Terminal is the one widget type in this phase that implements
 * `Navigatable` -- its widget really does extend `BaseWidget`
 * (`NavigatableWidget.is` requires `instanceof BaseWidget`, and
 * `PreferencesWidget`, the other candidate, extends Lumino's raw `Panel`
 * and never could), and tab-context URI selection is a genuine win for a
 * multi-instance type.
 *
 * `getResourceUri()` reads `this.id` directly rather than reaching into the
 * registry: `terminalIdentityOptions` above always sets `id` and `created`
 * to the identical name, and `TerminalWidgetImpl`'s own `@postConstruct`
 * sets `this.id` from that same injected id (`terminal-widget-impl.ts`'s
 * `init()`), so the widget's own id IS its `terminal:` address.
 *
 * `createMoveToUri` returns `undefined` -- Terminal is never a move
 * target, but `Navigatable.is` duck-types on *both* methods existing
 * (`'getResourceUri' in arg && 'createMoveToUri' in arg`), so omitting it
 * would silently fail the check this class exists to satisfy.
 *
 * Deliberately does NOT add a `saveable` property. `Saveable.isSource`
 * (`'saveable' in arg`) is the first test `FilesystemSaveableService`'s
 * `canSaveAs` gate runs, before it ever reaches `Navigatable.is` -- so
 * Terminal fails the gate on that first test alone, and Save-As stays off
 * with no extra guard needed (D-52, verified live against the running app,
 * not merely inferred from the gate's source).
 */
@injectable()
export class SourcererTerminalWidget extends TerminalWidgetImpl implements Navigatable {
    getResourceUri(): URI | undefined {
        return new URI('terminal:' + this.id);
    }
    createMoveToUri(): URI | undefined {
        return undefined;
    }
}
