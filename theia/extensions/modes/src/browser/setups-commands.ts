import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { SetupsService } from './setups-service';

/**
 * GUI-09 (14-03): the setups extension's four commands.
 *
 * Command-per-action model (chrome-bar-commands.ts precedent): each id is a
 * named export so the roundtrip gate imports the const instead of retyping
 * the string. Save and Delete carry 14-UI-SPEC.md's contracted labels
 * verbatim. NG-031: Restore and the dependent-window command carry labels
 * too, so the palette lists them, and both sit in the View menu. Delete Setup
 * is the ONLY destructive action in the phase (contracted confirmation, no
 * undo); core-close deliberately carries no dialog.
 */
export const SETUPS_SAVE_COMMAND_ID = 'powerbrowser.setups.save-setup';
export const SETUPS_DELETE_COMMAND_ID = 'powerbrowser.setups.delete-setup';
export const SETUPS_RESTORE_COMMAND_ID = 'powerbrowser.setups.restore-setup';
export const SETUPS_OPEN_DEPENDENT_COMMAND_ID = 'powerbrowser.setups.open-dependent';

export const SETUPS_SAVE: Command = {
    id: SETUPS_SAVE_COMMAND_ID,
    label: 'Save Setup',
};

export const SETUPS_DELETE: Command = {
    id: SETUPS_DELETE_COMMAND_ID,
    label: 'Delete Setup',
};

export const SETUPS_RESTORE: Command = {
    id: SETUPS_RESTORE_COMMAND_ID,
    label: 'Restore Setup',
};

export const SETUPS_OPEN_DEPENDENT: Command = {
    id: SETUPS_OPEN_DEPENDENT_COMMAND_ID,
    label: 'Open Tab in Own Window',
};

/** NG-031: the View menu group both entries live in (View, layout section). */
export const SETUPS_MENU = [...CommonMenus.VIEW_LAYOUT, 'pb_setups'];

@injectable()
export class SetupsCommandContribution implements CommandContribution, MenuContribution {

    @inject(SetupsService)
    protected readonly setups: SetupsService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SETUPS_SAVE, {
            execute: () => this.setups.saveCurrentAsSetup(),
        });
        commands.registerCommand(SETUPS_DELETE, {
            execute: () => this.setups.deleteSetup(),
        });
        commands.registerCommand(SETUPS_RESTORE, {
            execute: (name: string | undefined) => this.setups.restoreSetup(typeof name === 'string' ? name : undefined),
        });
        commands.registerCommand(SETUPS_OPEN_DEPENDENT, {
            execute: (widgetId: string | undefined) => this.setups.openDependent(typeof widgetId === 'string' ? widgetId : undefined),
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(SETUPS_MENU, { commandId: SETUPS_RESTORE.id, order: '1' });
        menus.registerMenuAction(SETUPS_MENU, { commandId: SETUPS_OPEN_DEPENDENT.id, order: '2' });
    }
}
