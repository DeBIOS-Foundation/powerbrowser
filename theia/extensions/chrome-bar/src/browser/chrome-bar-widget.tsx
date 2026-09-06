import * as React from '@theia/core/shared/react';
import { injectable, inject } from '@theia/core/shared/inversify';
import { ApplicationShell, FrontendApplicationContribution, ReactWidget } from '@theia/core/lib/browser';
import { CommandRegistry } from '@theia/core/lib/common';
import { NavigationLocationService } from '@theia/editor/lib/browser/navigation/navigation-location-service';
import {
    CHROME_BAR_BACK_COMMAND_ID,
    CHROME_BAR_FORWARD_COMMAND_ID,
    CHROME_BAR_INPUT_CLASS,
    CHROME_BAR_NEW_TAB_COMMAND_ID,
    CHROME_BAR_RELOAD_COMMAND_ID,
} from './chrome-bar-commands';

/**
 * GUI-06 (13-03): the chrome bar widget shell.
 *
 * A React contribution added once at startup to the top shell area -- the
 * plain Lumino panel above the main dock, so no core patch and no dock
 * surgery (13-RESEARCH.md Pattern 1). Structural class hooks below are the
 * style layer's contract (task 3 targets them verbatim): bar, buttons,
 * pill, input, dropdown, rows, toggle, segments, tab count.
 *
 * Menu-visibility coupling (13-RESEARCH.md Pitfall 1): the whole top panel
 * hides with `window.menuBarVisibility`, so this bar vanishes with the
 * menu. The menu stays visible by default and no check ever asserts bar
 * visibility while the menu is hidden.
 *
 * No chrome-side command is registered and nothing opens at startup: the
 * bar only issues commands through the registry on user gestures (a
 * startup-opened window would break the stock chrome per the candidate-A
 * constraint).
 */
export class ChromeBarWidget extends ReactWidget {

    static readonly ID = 'powerbrowser.chrome-bar';

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    @inject(NavigationLocationService)
    protected readonly navigation: NavigationLocationService;

    constructor() {
        super();
        this.id = ChromeBarWidget.ID;
        this.title.label = 'Chrome Bar';
        this.title.caption = 'Chrome Bar';
        this.title.closable = false;
    }

    protected runCommand = (id: string) => async (): Promise<void> => {
        await this.commands.executeCommand(id);
        this.update();
    };

    protected render(): React.ReactNode {
        const canBack = this.navigation.canGoBack();
        const canForward = this.navigation.canGoForward();
        return <div className='pb-chrome-bar'>
            <button
                className='pb-chrome-bar-button'
                title='Back'
                aria-label='Back'
                disabled={!canBack}
                onClick={this.runCommand(CHROME_BAR_BACK_COMMAND_ID)}
            >
                <span className='codicon codicon-chevron-left' />
            </button>
            <button
                className='pb-chrome-bar-button'
                title='Forward'
                aria-label='Forward'
                disabled={!canForward}
                onClick={this.runCommand(CHROME_BAR_FORWARD_COMMAND_ID)}
            >
                <span className='codicon codicon-chevron-right' />
            </button>
            <button
                className='pb-chrome-bar-button'
                title='Reload'
                aria-label='Reload'
                disabled={true}
                onClick={this.runCommand(CHROME_BAR_RELOAD_COMMAND_ID)}
            >
                <span className='codicon codicon-refresh' />
            </button>
            <div className='pb-chrome-bar-pill'>
                <input
                    className={CHROME_BAR_INPUT_CLASS}
                    placeholder='Search or enter address'
                    aria-label='Search or enter address'
                    spellCheck={false}
                />
            </div>
            <button
                className='pb-chrome-bar-button'
                title='New Tab'
                aria-label='New Tab'
                onClick={this.runCommand(CHROME_BAR_NEW_TAB_COMMAND_ID)}
            >
                <span className='codicon codicon-plus' />
            </button>
            <div className='pb-chrome-bar-toggle' role='group' aria-label='Mode'>
                <button className='pb-chrome-bar-segment' type='button'>Coding</button>
                <button className='pb-chrome-bar-segment' type='button'>Browsing</button>
                <button className='pb-chrome-bar-segment' type='button'>Organising</button>
            </div>
        </div>;
    }
}

@injectable()
export class ChromeBarContribution implements FrontendApplicationContribution {

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(ChromeBarWidget)
    protected readonly barWidget: ChromeBarWidget;

    async onStart(): Promise<void> {
        if (!this.shell.getWidgetById(ChromeBarWidget.ID)) {
            await this.shell.addWidget(this.barWidget, { area: 'top' });
        }
    }
}
