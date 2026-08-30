import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell, OpenHandler, OpenerOptions, OpenViewArguments, WidgetManager
} from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { PreferenceOpenHandler } from '@theia/preferences/lib/browser/preference-open-handler';
import { PluginViewRegistry } from '@theia/plugin-ext/lib/main/browser/view/plugin-view-registry';
import { TabUriRegistry } from './tab-uri-registry';
import { PLUGIN_VIEW_CONTAINER_FACTORY_ID, SETTINGS_WIDGET_FACTORY_ID } from './view-factory-table';

/**
 * The `view:`/`settings:` OpenHandler (D-44). A **bare** `OpenHandler`,
 * never `WidgetOpenHandler` -- that base class hardcodes
 * `shell.addWidget(widget, { area: 'main' })`, which would attach Problems
 * or Outline to the main area instead of the panel each view's own
 * contribution declares. Delegating to
 * `AbstractViewContribution.openView(...)` is what makes a URI-driven
 * first open land identically to the menu/command path, because that
 * method reads the area from the contribution's own `defaultViewOptions`.
 */
@injectable()
export class ViewUriOpenHandler implements OpenHandler {

    readonly id = 'powerbrowser.view-uri-open-handler';

    @inject(TabUriRegistry)
    protected readonly registry: TabUriRegistry;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(PreferenceOpenHandler)
    protected readonly preferenceOpenHandler: PreferenceOpenHandler;

    @inject(PluginViewRegistry)
    protected readonly pluginViewRegistry: PluginViewRegistry;

    // 1000 or 0, synchronously, on scheme alone -- never a negative number.
    // `Prioritizeable.isValid` tests `priority > 0`, contradicting the
    // interface's own doc comment ("return a nonzero number"). 1000 clears
    // every in-tree bidder (the editor at 100, output/notebook-cell at
    // 200, preference/command/http/registry/custom-editor at 500) while
    // leaving `defaultHandlerPriority` (100_000) above it, so a user's
    // `workbench.editorAssociations` can still override -- which is
    // correct.
    canHandle(uri: URI): number {
        return uri.scheme === 'view' || uri.scheme === 'settings' ? 1000 : 0;
    }

    async open(uri: URI, options?: OpenerOptions): Promise<object | undefined> {
        const viewArgs: Partial<OpenViewArguments> = { activate: true, reveal: true, ...(options as Partial<OpenViewArguments> | undefined) };
        return uri.scheme === 'settings' ? this.openSettings(uri, viewArgs) : this.openView(uri, viewArgs);
    }

    protected async openView(uri: URI, viewArgs: Partial<OpenViewArguments>): Promise<object | undefined> {
        const name = this.registry.parseName(uri);
        const contribution = this.registry.getViewContribution(name);
        if (contribution) {
            await contribution.openView(viewArgs);
            // `AbstractViewContribution.openView()`'s own return value
            // resolves via `this.widget`, which is keyed by `viewId`
            // (`options.widgetId`) -- for a contribution whose
            // `viewContainerId` differs from its `widgetId` (every
            // container row here), that is the container's PART, not the
            // container this `view:` path addresses (found live: opening
            // `view:explorer-view-container` returned the `files`
            // FileNavigatorWidget instead of the container). Fetch the
            // widget keyed by `name` instead -- `name` IS
            // `effectiveWidgetId`, the id the registry indexes by and the
            // id `openView()` itself just used to attach/reveal/activate
            // in the shell -- so this is a cache hit, never a second
            // creation.
            return this.widgetManager.getOrCreateWidget(name, undefined);
        }
        if (name.startsWith(PLUGIN_VIEW_CONTAINER_FACTORY_ID + ':')) {
            // No table entry needed -- the identifier's own id already
            // equals the full path (D-50). Delegates to
            // `PluginViewRegistry.openViewContainer` -- the real Theia
            // code path, and the fix for CR-01: `getOrCreateWidget` alone
            // never attaches a brand-new widget to the shell, so a bare
            // `getOrCreateWidget` + `activateWidget` sequence silently
            // no-oped on the first-ever open of a container (`activateWidget`
            // reads `this.tracker.widgets`, which only contains attached
            // widgets). `openViewContainer` calls
            // `shell.addWidget(containerWidget, { area, rank })` whenever
            // `!containerWidget.isAttached`
            // (`plugin-view-registry.ts:805-809` in the pinned v1.74.1
            // source) before this handler's own `activateWidget` runs.
            // `PluginViewRegistry`'s own `toViewContainerIdentifier`
            // produces the identical `{id, progressLocationId}` shape this
            // file's `TabUriRegistry.createWidgetOptions` already returns
            // for this branch (verified against
            // `plugin-view-registry.ts:982-984`), so delegating cannot
            // fork the widget under D-46's dedup key.
            const viewContainerId = name.substring(PLUGIN_VIEW_CONTAINER_FACTORY_ID.length + 1);
            const widget = await this.pluginViewRegistry.openViewContainer(viewContainerId);
            if (!widget) {
                throw new Error(`powerbrowser.view-uri-open-handler: no plugin view container '${viewContainerId}'`);
            }
            await this.shell.activateWidget(widget.id);
            return widget;
        }
        // An unknown `view:` path must surface an error the caller can
        // see, not resolve to `undefined` silently -- a silent no-op fails
        // at exactly the moment a human types the URI by hand, which is
        // URI-04's whole acceptance criterion.
        throw new Error(`powerbrowser.view-uri-open-handler: no view registered for 'view:${name}'`);
    }

    protected async openSettings(uri: URI, viewArgs: Partial<OpenViewArguments>): Promise<object | undefined> {
        const name = this.registry.parseName(uri);
        const contribution = this.registry.getViewContribution(SETTINGS_WIDGET_FACTORY_ID);
        if (!name) {
            // An empty path means the Settings widget itself.
            if (!contribution) {
                throw new Error('powerbrowser.view-uri-open-handler: settings_widget view contribution not found');
            }
            await contribution.openView(viewArgs);
            // Same defensive fetch-by-id as openView() above, rather than
            // trusting openView()'s own return value.
            return this.widgetManager.getOrCreateWidget(SETTINGS_WIDGET_FACTORY_ID, undefined);
        }
        // A non-empty path is a preference id, delegated verbatim to
        // Theia's already-bound preference open handler -- never
        // reimplement preference navigation. Settings is addressed
        // through this bespoke scheme rather than `view:` because its
        // widget extends `Panel`, not `BaseWidget`, so it can never
        // satisfy the tab bar's navigable check by any amount of method
        // stamping -- exactly why this phase is registry-first, not
        // navigable-first. `PreferenceOpenHandler.open` resolves to a
        // boolean, not the widget, so the widget is fetched back off the
        // contribution it just opened, to keep this handler's return
        // value honest (an opened widget, per the OpenHandler contract).
        await this.preferenceOpenHandler.open(new URI('preference:' + name));
        return contribution?.tryGetWidget();
    }
}
