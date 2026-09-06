/**
 * GUI-06 (13-02): backend composition for the chrome-bar suggestion path.
 *
 * Shape mirrors `tab-query-backend-module.ts` (one ContainerModule, composed
 * via the `backend` entry in this extension's package.json with no app-file
 * edit and no core patch), plus the standard JSON-RPC binding: the
 * connection handler serves the suggestion implementation at
 * `CHROME_SUGGESTION_PATH` over the existing authenticated websocket -- no
 * new channel, no HTTP route, so no application-contribution binding and no
 * token-gate re-review. All binds are static at module load (D-50).
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { CHROME_SUGGESTION_PATH, ChromeBarSuggestionService } from '../browser/chrome-bar-suggestion-service';
import { ChromeBarSuggestionServiceImpl } from './chrome-bar-suggestion-service-impl';

export default new ContainerModule(bind => {
    bind(ChromeBarSuggestionServiceImpl).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<ChromeBarSuggestionService>(CHROME_SUGGESTION_PATH, () =>
            ctx.container.get(ChromeBarSuggestionServiceImpl)
        )
    );
});
