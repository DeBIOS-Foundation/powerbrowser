/**
 * Non-GUI wave B: backend composition for the tab-store endpoint
 * (NG-025/NG-026). Composed through its own package.json entry so the
 * existing tab-query module stays untouched. Static binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { TabStoreAccessEndpoint } from './tab-store-access-endpoint';

export default new ContainerModule(bind => {
    bind(TabStoreAccessEndpoint).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(TabStoreAccessEndpoint);
});
