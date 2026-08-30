import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { PowerBrowserTokenGateContribution } from './token-gate-backend-contribution';
import { PowerBrowserParentWatchdogContribution } from './parent-watchdog-backend-contribution';

export default new ContainerModule(bind => {
    bind(PowerBrowserTokenGateContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PowerBrowserTokenGateContribution);

    bind(PowerBrowserParentWatchdogContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(PowerBrowserParentWatchdogContribution);
});
