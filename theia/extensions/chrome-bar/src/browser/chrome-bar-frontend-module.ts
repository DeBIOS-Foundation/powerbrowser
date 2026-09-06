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
import { FrontendApplicationContribution, KeybindingContribution, WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { CHROME_SUGGESTION_PATH, ChromeBarSuggestionService } from './chrome-bar-suggestion-service';
import { ChromeBarCommandContribution } from './chrome-bar-commands';
import { ChromeBarKeybindingContribution } from './chrome-bar-keybindings';
import { ChromeBarContribution, ChromeBarWidget } from './chrome-bar-widget';

export default new ContainerModule(bind => {
    bind(ChromeBarSuggestionService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<ChromeBarSuggestionService>(ctx.container, CHROME_SUGGESTION_PATH)
    ).inSingletonScope();
    bind(ChromeBarCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(ChromeBarCommandContribution);
    bind(ChromeBarKeybindingContribution).toSelf().inSingletonScope();
    bind(KeybindingContribution).toService(ChromeBarKeybindingContribution);
    bind(ChromeBarWidget).toSelf().inSingletonScope();
    bind(ChromeBarContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ChromeBarContribution);
});
