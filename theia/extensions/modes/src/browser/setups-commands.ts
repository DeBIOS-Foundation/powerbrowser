import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { SetupsService } from './setups-service';

/**
 * GUI-09 (14-03): the setups extension's four commands.
 *
 * Command-per-action model (chrome-bar-commands.ts precedent): each id is a
 * named export so the roundtrip gate imports the const instead of retyping
 * the string. Save and Delete carry 14-UI-SPEC.md's contracted labels
 * verbatim; Restore and Dependent-open carry NO label so they stay
 * list-invoked without inventing palette copy. Delete Setup is the ONLY
 * destructive action in the phase (contracted confirmation, no undo);
 * core-close deliberately carries no dialog.
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
};

export const SETUPS_OPEN_DEPENDENT: Command = {
    id: SETUPS_OPEN_DEPENDENT_COMMAND_ID,
};

@injectable()
export class SetupsCommandContribution implements CommandContribution {

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
}
