import { injectable } from '@theia/core/shared/inversify';
import { AbstractViewContribution, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PowerBrowserWelcomeWidget } from './powerbrowser-welcome-widget';

export const PowerBrowserWelcomeCommand = {
    id: 'powerbrowser.welcome:toggle',
    label: 'Toggle Welcome'
};

// Registered through `AbstractViewContribution` (not `shell.addWidget`
// directly) so Plan 06's `view:` handler -- which discovers its targets by
// scanning `AbstractViewContribution` instances -- can address this widget
// as `view:welcome`.
@injectable()
export class PowerBrowserWelcomeViewContribution extends AbstractViewContribution<PowerBrowserWelcomeWidget> implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: 'welcome',
            widgetName: 'Welcome',
            defaultWidgetOptions: {
                area: 'main',
            },
            toggleCommandId: PowerBrowserWelcomeCommand.id,
        });
    }

    // `initializeLayout` only runs when `FrontendApplication` finds no
    // persisted layout to restore (frontend-application.ts's
    // `createDefaultLayout`), which is exactly the first-boot-only behaviour
    // `@theia/getting-started` provided (D-24). Do not open it from
    // `onStart`, which would reopen the tab on every reload after the user
    // closes it.
    async initializeLayout(): Promise<void> {
        await this.openView({ reveal: true });
    }
}
