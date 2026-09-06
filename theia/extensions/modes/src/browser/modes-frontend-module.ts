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
import { FrontendApplicationContribution, WebSocketConnectionProvider, WidgetFactory } from '@theia/core/lib/browser';
import { CommandContribution } from '@theia/core/lib/common';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import { bindViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { GROUP_PATH, GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';
import { SHIPPED_MODES } from './mode-descriptors';
import { ModeService } from './mode-service';
import { ModesCommandContribution } from './modes-commands';
import { SetupsService } from './setups-service';
import { SetupsCommandContribution } from './setups-commands';
import { DependentWindowsContribution } from './dependent-windows';
import { GroupModel } from './group-model';
import { GroupActorClient } from './group-actor-client';
import { OrganisingCommandHandler, OrganisingContribution, OrganisingWidget } from './organising-widget';
import { PanoramaCommandContribution, PanoramaCommandHandler } from './panorama-commands';

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
    // GUI-08 (15-01, placeholder retired 15-03): the Panorama widget owns
    // the organising slot behind the same contribution point. The group
    // reader proxy, the single model, the actor client, and the panorama
    // commands bind statically beside the other binds, in the same voice
    // (D-50).
    bind(GroupQueryService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<GroupQueryService>(ctx.container, GROUP_PATH)
    ).inSingletonScope();
    bind(GroupModel).toSelf().inSingletonScope();
    bind(GroupActorClient).toSelf().inSingletonScope();
    bind(PanoramaCommandHandler).to(OrganisingCommandHandler).inSingletonScope();
    bind(PanoramaCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(PanoramaCommandContribution);
    // GUI-08: the widget itself and a factory keyed on its id. openView()
    // resolves through WidgetManager.getOrCreateWidget(id), which needs a
    // WidgetFactory registered under exactly that id -- bindViewContribution
    // registers none. Without both binds the open path rejected, and because
    // every caller voids that promise the rejection was swallowed: switching
    // to Organising collapsed the panels and then silently did nothing.
    bind(OrganisingWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: OrganisingWidget.ID,
        createWidget: () => ctx.container.get(OrganisingWidget),
    })).inSingletonScope();
    bindViewContribution(bind, OrganisingContribution);
    // GUI-08: bindViewContribution binds only Command/Keybinding/Menu --
    // NOT FrontendApplicationContribution -- so onStart() never fires on a
    // view contribution unless it is bound here as well. Without this the
    // contribution's registerOrganisingSlot() never runs, leaving the slot
    // seam undefined and openOrganisingSlot() a permanent silent no-op:
    // switching to Organising collapsed the panels and rendered nothing.
    bind(FrontendApplicationContribution).toService(OrganisingContribution);
});
