/**
 * SQL-04 (12-02): backend composition for the readonly tab query service.
 *
 * Shape copied from `token-gate-backend-module.ts`: one singleton binding
 * in a ContainerModule, composed via the `backend` entry in this
 * extension's package.json with no app-file edit and no core patch. The
 * service exposes no HTTP route, so no application-contribution binding.
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { GROUP_PATH, GroupQueryService } from '../browser/group-query-service';
import { TabQueryService } from './tab-query-service';

export default new ContainerModule(bind => {
    bind(TabQueryService).toSelf().inSingletonScope();
    // GUI-08 (15-01): the group-read handler serves the reader's group
    // methods at GROUP_PATH over the existing authenticated websocket --
    // the chrome-bar-backend-module mirror: no new channel, no HTTP route.
    // TabQueryService structurally satisfies GroupQueryService (its group
    // reads are async), so no separate impl class is needed.
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<GroupQueryService>(GROUP_PATH, () =>
            ctx.container.get(TabQueryService)
        )
    );
});
