import { injectable } from '@theia/core/shared/inversify';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
import { CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID } from './chrome-bar-commands';

/**
 * GUI-06 (13-03): the chrome bar's keybindings.
 *
 * One binding only: focusing the address pill. Registered for both
 * platform modifiers (Ctrl on Linux/Windows, Cmd on macOS) against the
 * imported focus-command const -- never a re-spelled id string. Bound
 * statically at module load beside the plan 13-02 bindings (D-50: a
 * contribution bound after first enumeration is permanently invisible).
 */
@injectable()
export class ChromeBarKeybindingContribution implements KeybindingContribution {

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID,
            keybinding: 'ctrl+l',
        });
        keybindings.registerKeybinding({
            command: CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID,
            keybinding: 'cmd+l',
        });
    }
}
