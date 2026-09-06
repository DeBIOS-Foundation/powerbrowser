/**
 * GUI-06 (13-02): frontend composition for the chrome-bar suggestion path.
 *
 * Binds the suggestion interface to a websocket proxy on the existing
 * authenticated channel -- the mirror of the backend's connection handler
 * at the same `CHROME_SUGGESTION_PATH`, so no new transport exists to
 * review. Static at module load (D-50): a contribution bound after first
 * enumeration is permanently invisible, and the same holds for a proxy the
 * widget (landing in 13-03) injects at startup.
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { CHROME_SUGGESTION_PATH, ChromeBarSuggestionService } from './chrome-bar-suggestion-service';

export default new ContainerModule(bind => {
    bind(ChromeBarSuggestionService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<ChromeBarSuggestionService>(ctx.container, CHROME_SUGGESTION_PATH)
    ).inSingletonScope();
});
