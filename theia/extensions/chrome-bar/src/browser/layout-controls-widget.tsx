/**
 * VS Code's title-bar layout controls, for Coding: toggle the left, bottom
 * and right panels, and the Manage (gear) menu. They sit at the right end of
 * the menubar row, left of chrome's window buttons.
 *
 * Nothing new is behind them: each toggle runs the stock command the
 * palette and keybindings already run, and the gear opens the same menu as
 * the gear at the foot of the left rail. Only the buttons are ours.
 *
 * Coding only -- ChromeBarContribution.applyStripHome hides it in every
 * other mode, which keeps the side panels closed on purpose.
 */

import * as React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, ContextMenuRenderer, ReactWidget } from '@theia/core/lib/browser';
import { CommonCommands } from '@theia/core/lib/browser/common-commands';
import { Command, CommandRegistry, MANAGE_MENU } from '@theia/core/lib/common';

const TOGGLES: readonly { command: Command; area: ApplicationShell.Area; icon: string; title: string }[] = [
    { command: CommonCommands.TOGGLE_LEFT_PANEL, area: 'left', icon: 'layout-sidebar-left', title: 'Toggle Left Panel' },
    { command: CommonCommands.TOGGLE_BOTTOM_PANEL, area: 'bottom', icon: 'layout-panel', title: 'Toggle Bottom Panel' },
    { command: CommonCommands.TOGGLE_RIGHT_PANEL, area: 'right', icon: 'layout-sidebar-right', title: 'Toggle Right Panel' },
];

@injectable()
export class LayoutControlsWidget extends ReactWidget {

    static readonly ID = 'powerbrowser.layout-controls';

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    @inject(ContextMenuRenderer)
    protected readonly menus: ContextMenuRenderer;

    @postConstruct()
    protected init(): void {
        this.id = LayoutControlsWidget.ID;
        this.addClass('pb-layout-controls');
        this.setHidden(true);
        // A panel opens or closes by command (these buttons, Ctrl+B, the
        // palette) or by clicking a rail icon, which changes the active widget.
        // shortcut: no shell event for "a panel collapsed"; a toggle by another
        // path leaves the icon stale until the next of these fires.
        this.toDispose.pushAll([
            this.commands.onDidExecuteCommand(() => this.update()),
            this.shell.onDidChangeActiveWidget(() => this.update()),
            this.shell.onDidAddWidget(() => this.update()),
            this.shell.onDidRemoveWidget(() => this.update()),
        ]);
        this.update();
    }

    protected openManageMenu(event: React.MouseEvent<HTMLButtonElement>): void {
        const button = event.currentTarget.getBoundingClientRect();
        this.menus.render({
            menuPath: MANAGE_MENU,
            includeAnchorArg: false,
            anchor: { x: button.right, y: button.bottom },
            context: event.currentTarget,
        });
    }

    protected render(): React.ReactNode {
        return <>
            {TOGGLES.map(({ command, area, icon, title }) => {
                const open = this.shell.isExpanded(area);
                return <button
                    key={area}
                    type='button'
                    className={'pb-layout-control' + (open ? ' is-active' : '')}
                    title={title}
                    aria-label={title}
                    aria-pressed={open}
                    onClick={() => void this.commands.executeCommand(command.id)}
                >
                    <span className={`codicon codicon-${icon}${open ? '' : '-off'}`} />
                </button>;
            })}
            <button
                type='button'
                className='pb-layout-control'
                title='Manage'
                aria-label='Manage'
                aria-haspopup='menu'
                onClick={event => this.openManageMenu(event)}
            >
                <span className='codicon codicon-settings-gear' />
            </button>
        </>;
    }
}
