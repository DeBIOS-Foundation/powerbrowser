/**
 * Non-GUI wave B: frontend composition for Theia's chrome-store reader
 * (NG-021..NG-024), the endpoint relay (NG-025/NG-026) and Save Page Copy
 * (NG-028). Its own package.json entry, so tab-uris-frontend-module.ts stays
 * untouched. Static binds only (D-50).
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution } from '@theia/core/lib/common';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ChromeStoreClient } from './chrome-store-client';
import { SavePageCopyCommandContribution } from './save-page-copy-command';
import { TabStoreRelayContribution } from './tab-store-relay-contribution';

export default new ContainerModule(bind => {
    bind(ChromeStoreClient).toSelf().inSingletonScope();
    bind(TabStoreRelayContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(TabStoreRelayContribution);
    bind(SavePageCopyCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(SavePageCopyCommandContribution);
});
