/**
 * GUI-06 (13-02 foundation, 13-03 presentation): frontend composition for
 * the chrome bar.
 *
 * Binds the suggestion interface to a websocket proxy on the existing
 * authenticated channel -- the mirror of the backend's connection handler
 * at the same `CHROME_SUGGESTION_PATH`, so no new transport exists to
 * review. Static at module load (D-50): a contribution bound after first
 * enumeration is permanently invisible, and the same holds for a proxy the
 * widget injects at startup. The 13-03 command, keybinding, widget, and
 * contribution binds sit beside the 13-02 proxy bind in the same voice.
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution } from '@theia/core/lib/common';
import {
    ApplicationShellOptions,
    FrontendApplicationContribution,
    KeybindingContribution,
    WebSocketConnectionProvider,
} from '@theia/core/lib/browser';
import { CHROME_SUGGESTION_PATH, ChromeBarSuggestionService } from './chrome-bar-suggestion-service';
import { ChromeBarCommandContribution } from './chrome-bar-commands';
import { ChromeBarKeybindingContribution } from './chrome-bar-keybindings';
import { ChromeBarContribution, ChromeBarWidget } from './chrome-bar-widget';
import { TabStripWidget } from './tab-strip-widget';

export default new ContainerModule((bind, _unbind, _isBound, rebind) => {
    // Dragging a tab must not summon the IDE.
    //
    // The shell watches every widget drag and expands whichever side panel
    // the pointer comes near, so it can be dropped there -- correct in an
    // IDE, wrong in a browser. Dragging a tab toward either edge of a
    // Browsing window made both icon rails and the file explorer appear, and
    // dropping there did not split the pane: it docked the tab INTO the
    // sidebar, where a web page is not something the user can get back to.
    // Reported live 2026-09-09, with the tab visible in the left panel.
    //
    // `expandThreshold` is the width of that edge band, and it is a shell
    // option the framework already exposes for configuring exactly this. Zero
    // means the band has no width, so no drag can ever reach it. It is read
    // in one place -- `ApplicationShell.onDragOver` -- and nowhere else, so
    // this removes the reveal and changes nothing else.
    //
    // Coding is untouched in practice: its panels are already expanded, and
    // the shell only auto-expands a panel whose tab bar has no current title.
    // Dropping a widget into a side panel that is open still works there.
    //
    // Partial by design: the shell spreads this over its own defaults per
    // panel, so `emptySize`, `expandDuration` and `initialSizeRatio` keep
    // their framework values.
    rebind(ApplicationShellOptions).toConstantValue({
        leftPanel: { expandThreshold: 0 },
        rightPanel: { expandThreshold: 0 },
        bottomPanel: { expandThreshold: 0 },
    });
    bind(ChromeBarSuggestionService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<ChromeBarSuggestionService>(ctx.container, CHROME_SUGGESTION_PATH)
    ).inSingletonScope();
    bind(ChromeBarCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(ChromeBarCommandContribution);
    bind(ChromeBarKeybindingContribution).toSelf().inSingletonScope();
    bind(KeybindingContribution).toService(ChromeBarKeybindingContribution);
    bind(ChromeBarWidget).toSelf().inSingletonScope();
    bind(TabStripWidget).toSelf().inSingletonScope();
    bind(ChromeBarContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ChromeBarContribution);
});
