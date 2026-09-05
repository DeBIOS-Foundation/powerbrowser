/**
 * SQL-04 (12-02): backend composition for the readonly tab query service.
 *
 * Shape copied from `token-gate-backend-module.ts`: one singleton binding
 * in a ContainerModule, composed via the `backend` entry in this
 * extension's package.json with no app-file edit and no core patch. The
 * service exposes no HTTP route, so no application-contribution binding.
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { TabQueryService } from './tab-query-service';

export default new ContainerModule(bind => {
    bind(TabQueryService).toSelf().inSingletonScope();
});
