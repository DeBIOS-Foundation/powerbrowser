/**
 * Non-GUI wave B: backend composition for the tab-store endpoint
 * (NG-025/NG-026) and the relay hub it reaches chrome through
 * (NG-021..NG-026). Composed through its own package.json entry so the
 * existing tab-query module stays untouched. Static binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { TAB_STORE_RELAY_PATH, TabStoreRelayClient, TabStoreRelayServer } from '../browser/tab-store-access-protocol';
import { TabStoreAccessEndpoint } from './tab-store-access-endpoint';
import { TabStoreRelayHub } from './tab-store-relay';

export default new ContainerModule(bind => {
    bind(TabStoreRelayHub).toSelf().inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<TabStoreRelayClient>(TAB_STORE_RELAY_PATH, client => {
            ctx.container.get(TabStoreRelayHub).add(client);
            const server: TabStoreRelayServer = { register: async () => true };
            return server;
        })
    ).inSingletonScope();
    bind(TabStoreAccessEndpoint).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(TabStoreAccessEndpoint);
});
