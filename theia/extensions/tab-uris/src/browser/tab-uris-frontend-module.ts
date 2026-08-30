import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, OpenHandler, OpenerService, WidgetManager } from '@theia/core/lib/browser';
import { Disposable } from '@theia/core/lib/common';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';
import { TerminalFrontendContribution } from '@theia/terminal/lib/browser/terminal-frontend-contribution';
import { TerminalWidget } from '@theia/terminal/lib/browser/base/terminal-widget';
import { TabUriRegistry } from './tab-uri-registry';
import { ViewUriOpenHandler } from './view-open-handler';
import { SourcererTerminalFrontendContribution, SourcererTerminalWidget } from './terminal-naming-contribution';
import { TerminalUriOpenHandler } from './terminal-open-handler';
import { SourcererOutputOpenHandler, SourcererWebviewOpenHandler } from './existing-scheme-coverage';

/**
 * Registers an `OpenHandler` after the app's first `OpenerService.open()`
 * call, when a static `bind(OpenHandler)` would be permanently invisible:
 * `ContributionProvider.getContributions()` caches its array on first call
 * and drops its container reference (D-50). Exported for anything that
 * must register a `view:`/`settings:`-adjacent handler at runtime,
 * including a user's privileged `customize.js` (D-67's `container` on the
 * privileged-JS surface).
 */
export function registerLateOpenHandler(openerService: OpenerService, handler: OpenHandler): Disposable {
    if (!openerService.addHandler) {
        throw new Error('@sourcerer/tab-uris: OpenerService.addHandler is not available on this OpenerService implementation');
    }
    return openerService.addHandler(handler);
}

export default new ContainerModule((bind, _unbind, isBound, rebind) => {
    bind(TabUriRegistry).toSelf().inSingletonScope();

    // Registered as a static open-handler binding at module load -- the
    // ordinary path, reached by `DefaultOpenerService`'s
    // `ContributionProvider<OpenHandler>` before its first `getContributions()`
    // call caches. `registerLateOpenHandler` above is the escape hatch for
    // anything binding after that point.
    bind(ViewUriOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(ViewUriOpenHandler);

    // D-47: guarded rebind -- the in-tree idiom (see @sourcerer/branding's
    // own rebinds), keeps this module loadable even in a container where
    // @theia/terminal's own binding is somehow absent. Every terminal
    // binding in @theia/terminal is `.toService(TerminalFrontendContribution)`
    // (TerminalService, CommandContribution, MenuContribution,
    // KeybindingContribution, TabBarToolbarContribution, ColorContribution,
    // FrontendApplicationContribution -- verified against
    // terminal-frontend-module.ts's own binding block, broader than
    // CONTEXT.md's own summary of it), so this one rebind reaches all of
    // them.
    if (isBound(TerminalFrontendContribution)) {
        rebind(TerminalFrontendContribution).to(SourcererTerminalFrontendContribution).inSingletonScope();
    } else {
        bind(TerminalFrontendContribution).to(SourcererTerminalFrontendContribution).inSingletonScope();
    }
    // D-38: Terminal is the one widget type with a real `Navigatable`
    // implementation -- rebinding the `TerminalWidget` DI token (not a
    // subclass of the `terminal` WidgetFactory's own `createWidget`, which
    // stays untouched) means every terminal, regardless of which code path
    // created it, resolves through `SourcererTerminalWidget`.
    if (isBound(TerminalWidget)) {
        rebind(TerminalWidget).to(SourcererTerminalWidget).inTransientScope();
    } else {
        bind(TerminalWidget).to(SourcererTerminalWidget).inTransientScope();
    }

    bind(TerminalUriOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(TerminalUriOpenHandler);

    // D-51 carve-out 1 fix (existing-scheme-coverage.ts's own header has
    // the full story): @theia/output's own OutputContribution.open()
    // discards the URI's channel, found live. Priority 1000 clears its
    // 200 and delegates the actual reveal to it once the channel is
    // selected.
    bind(SourcererOutputOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(SourcererOutputOpenHandler);

    // D-43's session-scoped fourth scheme -- reuses WidgetManager's own
    // dedup, no restore machinery added (D-51 carve-out 4).
    bind(SourcererWebviewOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(SourcererWebviewOpenHandler);

    // D-27: the AI chat widget must never escape into a secondary window
    // -- the future unified tab strip has no way to model a chrome-owned
    // tab living outside the shell it tracks. Lives here rather than in
    // @sourcerer/branding because it is a tab-model constraint, not a
    // branding one.
    //
    // Implemented via `WidgetManager.onDidCreateWidget` rather than a
    // `rebind(ChatViewWidget)` subclass: `ChatViewWidget`'s constructor
    // takes seven injected parameters with no property-injection
    // equivalent, so a subclass rebind would have to re-declare and
    // forward all seven, silently drifting from upstream on the next
    // Theia version bump. `isExtractable` is a plain mutable field (not
    // `readonly`, not behind a getter), so setting it directly on the
    // just-created instance is the smaller, more robust surface for the
    // identical outcome -- no `rebind(ApplicationShell)`, no Navigatable,
    // no shell-hiding, none of this plan's other prohibitions touched.
    bind(FrontendApplicationContribution).toDynamicValue(ctx => ({
        onStart: () => {
            const widgetManager = ctx.container.get(WidgetManager);
            const markNonExtractable = (widget: unknown) => {
                if (widget instanceof ChatViewWidget) {
                    widget.isExtractable = false;
                }
            };
            // Covers both orderings relative to whichever
            // FrontendApplicationContribution creates the chat widget
            // first: a pre-existing widget (found live -- another AI
            // contribution's own `onStart` can create it before this one
            // runs, and `onDidCreateWidget` only fires once, on first
            // creation, so subscribing afterward misses that event) is
            // fixed immediately; any future creation is caught by the
            // subscription below.
            widgetManager.getWidgets(ChatViewWidget.ID).forEach(markNonExtractable);
            widgetManager.onDidCreateWidget(({ factoryId, widget }) => {
                if (factoryId === ChatViewWidget.ID) {
                    markNonExtractable(widget);
                }
            });
        },
    })).inSingletonScope();
});
