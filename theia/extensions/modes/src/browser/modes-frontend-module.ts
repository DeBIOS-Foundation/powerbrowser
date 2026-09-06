/**
 * GUI-07 (14-01): frontend composition for the modes extension.
 *
 * Registers the three shipped perspective descriptors synchronously in
 * onStart and returns immediately: awaiting a user-storage/backend read here
 * would re-enter the documented boot-chain deadlock (customize-css header),
 * so modes.json/custom-mode registration stays deferred to plan 14-02 and
 * this contribution carries no FileService import at all. Static binds at
 * module load (D-50): a contribution bound after first enumeration is
 * permanently invisible, so both binds sit beside each other in the same
 * voice as the chrome-bar module.
 */

import { ContainerModule } from '@theia/core/shared/inversify';
import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import { SHIPPED_MODES } from './mode-descriptors';

@injectable()
export class ModesContribution implements FrontendApplicationContribution {

    @inject(PerspectiveService)
    protected readonly perspectives: PerspectiveService;

    onStart(): void {
        for (const descriptor of SHIPPED_MODES) {
            this.perspectives.registerPerspective(descriptor);
        }
    }
}

export default new ContainerModule(bind => {
    bind(ModesContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ModesContribution);
});
