import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { NavigationLocationService } from '@theia/editor/lib/browser/navigation/navigation-location-service';
import { OPEN_BROWSER_WINDOW_COMMAND_ID } from '@powerbrowser/tab-uris/lib/browser/browser-window-command';

/**
 * GUI-06 (13-03): the chrome bar's five commands -- back, forward, reload,
 * new-tab, and the keybinding-only focus-address.
 *
 * Command-per-action model (13-PATTERNS.md section 2): each id is a named
 * export so call sites (the widget, the keybindings) and the verify row in
 * `scripts/verify-chrome-bar-commands.mjs` import the const instead of
 * retyping the string. Labels are 13-UI-SPEC.md's contracted copy verbatim;
 * the focus-only command carries NO label so it stays keybinding-reachable
 * without inventing copy.
 */
export const CHROME_BAR_BACK_COMMAND_ID = 'powerbrowser.chrome-bar.back';
export const CHROME_BAR_FORWARD_COMMAND_ID = 'powerbrowser.chrome-bar.forward';
export const CHROME_BAR_RELOAD_COMMAND_ID = 'powerbrowser.chrome-bar.reload';
export const CHROME_BAR_NEW_TAB_COMMAND_ID = 'powerbrowser.chrome-bar.new-tab';
export const CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID = 'powerbrowser.chrome-bar.focus-address';

export const CHROME_BAR_BACK: Command = {
    id: CHROME_BAR_BACK_COMMAND_ID,
    label: 'Back',
};

export const CHROME_BAR_FORWARD: Command = {
    id: CHROME_BAR_FORWARD_COMMAND_ID,
    label: 'Forward',
};

export const CHROME_BAR_RELOAD: Command = {
    id: CHROME_BAR_RELOAD_COMMAND_ID,
    label: 'Reload',
};

export const CHROME_BAR_NEW_TAB: Command = {
    id: CHROME_BAR_NEW_TAB_COMMAND_ID,
    label: 'New Tab',
};

/** Labelless by design: reachable through Ctrl/Cmd+L, never the palette. */
export const CHROME_BAR_FOCUS_ADDRESS: Command = {
    id: CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID,
};

/** Structural class hook for the address pill input (also the style layer's target). Lives beside the command ids deliberately, so the widget, focusAddressPill, and stylesheet share one import. */
export const CHROME_BAR_INPUT_CLASS = 'pb-chrome-bar-input';

/**
 * Focuses the address pill and selects its content. A DOM lookup, not a
 * widget reference: the command side must not import the widget (the
 * widget imports these ids -- the dependency runs one way only).
 */
export function focusAddressPill(): void {
    const input = document.querySelector<HTMLInputElement>(`.${CHROME_BAR_INPUT_CLASS}`);
    if (input) {
        input.focus();
        input.select();
    }
}

@injectable()
export class ChromeBarCommandContribution implements CommandContribution {

    @inject(NavigationLocationService)
    protected readonly navigation: NavigationLocationService;

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    registerCommands(commands: CommandRegistry): void {
        // Disabled-not-removed (13-UI-SPEC.md): visibility stays true while
        // enablement follows the history stack, so the buttons dim with
        // their tooltips retained and the layout never shifts.
        commands.registerCommand(CHROME_BAR_BACK, {
            execute: () => this.navigation.back(),
            isEnabled: () => this.navigation.canGoBack(),
            isVisible: () => true,
        });
        commands.registerCommand(CHROME_BAR_FORWARD, {
            execute: () => this.navigation.forward(),
            isEnabled: () => this.navigation.canGoForward(),
            isVisible: () => true,
        });
        // Reload enablement is Phase 14 / GUI-02 scope (13-RESEARCH.md Open
        // Question 1): registered now, disabled, with the contracted
        // tooltip carried by the widget button -- never removed.
        commands.registerCommand(CHROME_BAR_RELOAD, {
            execute: () => undefined,
            isEnabled: () => false,
            isVisible: () => true,
        });
        // New Tab reuses the ratified candidate-A channel by importing the
        // existing window-command const (never re-spelling its string): a
        // blocked popup takes that command's existing error path, and no
        // new dialog, toast, or error surface is authored here.
        commands.registerCommand(CHROME_BAR_NEW_TAB, {
            execute: () => this.commands.executeCommand(OPEN_BROWSER_WINDOW_COMMAND_ID),
        });
        commands.registerCommand(CHROME_BAR_FOCUS_ADDRESS, {
            execute: () => focusAddressPill(),
        });
    }
}
