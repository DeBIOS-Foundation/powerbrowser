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
import { CommandContribution } from '@theia/core/lib/common';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import { bindViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { SHIPPED_MODES } from './mode-descriptors';
import { ModeService } from './mode-service';
import { ModesCommandContribution } from './modes-commands';
import { SetupsService } from './setups-service';
import { SetupsCommandContribution } from './setups-commands';
import { DependentWindowsContribution } from './dependent-windows';
import { OrganisingPlaceholderContribution } from './organising-placeholder-widget';

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
    // GUI-07 (14-02): the custom-modes service and the mode commands bind
    // statically beside the shipped registration, in the same voice (D-50).
    bind(ModeService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(ModeService);
    bind(ModesCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(ModesCommandContribution);
    // GUI-09 (14-03): the named-setups service and the setup commands bind
    // statically beside the mode binds, in the same voice (D-50). The
    // dependent-windows contribution joins them in Task 2.
    bind(SetupsService).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(SetupsService);
    bind(SetupsCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(SetupsCommandContribution);
    // GUI-09 (14-03): the dependent-windows contribution binds statically
    // beside the setups binds, in the same voice (D-50).
    bind(DependentWindowsContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(DependentWindowsContribution);
    // GUI-07 (14-02): the organising placeholder view binds through its own
    // contribution path (never a hardcoded shell area); the Phase-15 canvas
    // replaces the slot behind this same point.
    bindViewContribution(bind, OrganisingPlaceholderContribution);
});
