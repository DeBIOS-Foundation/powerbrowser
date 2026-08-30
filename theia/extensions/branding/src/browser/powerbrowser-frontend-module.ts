import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WidgetFactory, bindViewContribution } from '@theia/core/lib/browser';
import { AboutDialog } from '@theia/core/lib/browser/about-dialog';
import { AIFirstPerspectiveContribution } from '@theia/ai-ide/lib/browser/ai-first-perspective-contribution';
import { AIAgentConfigurationViewContribution } from '@theia/ai-ide/lib/browser/ai-configuration/ai-configuration-view-contribution';
import { PowerBrowserFaviconContribution } from './powerbrowser-favicon-contribution';
import { PowerBrowserWelcomeWidget } from './powerbrowser-welcome-widget';
import { PowerBrowserWelcomeViewContribution } from './powerbrowser-welcome-contribution';
import { PowerBrowserAboutDialog } from './powerbrowser-about-dialog';
import { PowerBrowserAIFirstPerspectiveContribution, PowerBrowserAIConfigurationViewContribution } from './powerbrowser-ai-layout-contribution';

export default new ContainerModule((bind, _unbind, isBound, rebind) => {
    bind(PowerBrowserFaviconContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(PowerBrowserFaviconContribution);

    bind(PowerBrowserWelcomeWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: 'welcome', // D-43: the path is the factory id verbatim -- view:welcome
        createWidget: () => context.container.get<PowerBrowserWelcomeWidget>(PowerBrowserWelcomeWidget),
    })).inSingletonScope();
    bindViewContribution(bind, PowerBrowserWelcomeViewContribution);
    bind(FrontendApplicationContribution).toService(PowerBrowserWelcomeViewContribution);

    // D-35: guarded rebind -- the in-tree idiom, keeps the module loadable
    // in a container where the base AboutDialog binding is absent.
    if (isBound(AboutDialog)) {
        rebind(AboutDialog).to(PowerBrowserAboutDialog).inSingletonScope();
    } else {
        bind(AboutDialog).to(PowerBrowserAboutDialog).inSingletonScope();
    }

    // D-22: guarded rebinds neutralizing @theia/ai-ide's two first-boot
    // layout behaviours. See powerbrowser-ai-layout-contribution.ts for why
    // these live here rather than in @powerbrowser/tab-uris.
    if (isBound(AIFirstPerspectiveContribution)) {
        rebind(AIFirstPerspectiveContribution).to(PowerBrowserAIFirstPerspectiveContribution).inSingletonScope();
    } else {
        bind(AIFirstPerspectiveContribution).to(PowerBrowserAIFirstPerspectiveContribution).inSingletonScope();
    }
    if (isBound(AIAgentConfigurationViewContribution)) {
        rebind(AIAgentConfigurationViewContribution).to(PowerBrowserAIConfigurationViewContribution).inSingletonScope();
    } else {
        bind(AIAgentConfigurationViewContribution).to(PowerBrowserAIConfigurationViewContribution).inSingletonScope();
    }
});
