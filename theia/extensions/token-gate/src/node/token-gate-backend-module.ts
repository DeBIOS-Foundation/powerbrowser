import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { SourcererTokenGateContribution } from './token-gate-backend-contribution';
import { SourcererParentWatchdogContribution } from './parent-watchdog-backend-contribution';

export default new ContainerModule(bind => {
    bind(SourcererTokenGateContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(SourcererTokenGateContribution);

    bind(SourcererParentWatchdogContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(SourcererParentWatchdogContribution);
});
