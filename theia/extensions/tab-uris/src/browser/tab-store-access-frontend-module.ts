/**
 * Non-GUI wave B: frontend composition for Theia's chrome-store reader
 * (NG-021..NG-024) and the endpoint relay (NG-025/NG-026). Its own
 * package.json entry, so tab-uris-frontend-module.ts stays untouched. Static
 * binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ChromeStoreClient } from './chrome-store-client';
import { TabStoreRelayContribution } from './tab-store-relay-contribution';

export default new ContainerModule(bind => {
    bind(ChromeStoreClient).toSelf().inSingletonScope();
    bind(TabStoreRelayContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TabStoreRelayContribution);
});
