import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { ModeService } from './mode-service';

/**
 * GUI-07 (14-02): the modes extension's two commands.
 *
 * Command-per-action model (chrome-bar-commands.ts precedent): each id is a
 * named export so call sites (the chrome-bar widget's custom rows, the
 * organising placeholder's Back control) and the switch-invariant gate import
 * the const instead of retyping the string. The activate command carries NO
 * label so it stays toggle-invoked without inventing palette copy; the save
 * command carries 14-UI-SPEC.md's contracted "Save as Mode" label verbatim.
 */
export const MODES_ACTIVATE_COMMAND_ID = 'powerbrowser.modes.activate';
export const MODES_SAVE_AS_MODE_COMMAND_ID = 'powerbrowser.modes.save-as-mode';

export const MODES_ACTIVATE: Command = {
    id: MODES_ACTIVATE_COMMAND_ID,
};

export const MODES_SAVE_AS_MODE: Command = {
    id: MODES_SAVE_AS_MODE_COMMAND_ID,
    label: 'Save as Mode',
};

@injectable()
export class ModesCommandContribution implements CommandContribution {

    @inject(ModeService)
    protected readonly modes: ModeService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(MODES_ACTIVATE, {
            execute: (id: string | undefined) => this.modes.activateMode(typeof id === 'string' ? id : 'browsing'),
        });
        commands.registerCommand(MODES_SAVE_AS_MODE, {
            execute: () => this.modes.saveCurrentAsMode(),
        });
    }
}
