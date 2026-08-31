import { injectable } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';

/**
 * GUI-01's entry affordance: the palette-reachable command that opens a
 * stock Firefox browser window.
 *
 * Exported as a named constant so plan 01-06's GUI-02 frame-refusal escape
 * action can invoke it without duplicating the string, and so
 * `scripts/verify-gui01-command.mjs` can assert the id it looks up in the
 * live frontend's `CommandRegistry` is the same one this file registers
 * rather than a copy that could drift.
 */
export const OPEN_BROWSER_WINDOW_COMMAND_ID = 'powerbrowser.open-browser-window';

/**
 * The label is 01-UI-SPEC.md's contracted string for GUI-01's entry
 * affordance, verbatim. It is not "Open in browser window" -- that is
 * GUI-02's per-tab escape CTA, a different affordance with a different
 * label, added by plan 01-06.
 */
export const OPEN_BROWSER_WINDOW: Command = {
    id: OPEN_BROWSER_WINDOW_COMMAND_ID,
    label: 'Open Browser Window',
};

/**
 * The ratified frontend-to-chrome channel (01-SPIKE-GUI-01.md observation 7,
 * candidate A; ratified at this plan's Task 2 checkpoint).
 *
 * The Theia frontend is remote web content served from `http://127.0.0.1:<port>/`
 * inside the shell's `<xul:browser remote="true">`. It runs in its own content
 * process, so it cannot call a chrome API, reach a chrome global, or dispatch a
 * DOM event that chrome would see. A plain `window.open` is the one mechanism
 * that crosses that boundary using nothing but stock platform machinery:
 *
 *   nsWindowWatcher::OpenWindowInternal
 *     -> (the shell chrome window carries no nsIBrowserDOMWindow, so there is
 *        no tab to divert into)
 *     -> nsAppStartup::CreateChromeWindow
 *     -> AppWindow::CreateNewContentWindow, which opens BROWSER_CHROME_URL
 *
 * and since patch `020-powerbrowser-shell.patch` no longer overrides that
 * compiled define, BROWSER_CHROME_URL is stock upstream browser chrome -- with
 * its own address bar, tab strip, and in-window modal dialogs, which is exactly
 * what 01-UI-SPEC.md's GUI-01 contract asks for. No privileged code runs, so
 * this works with the privileged-JS development flag off (T-05-01), and it
 * introduces no new Firefox-internal touchpoint (T-05-02).
 *
 * The alternative -- a JSWindowActor pair calling
 * `PowerBrowserAPI.openBrowserWindow()` -- is the pre-approved fallback and is
 * deliberately NOT implemented: the popup path was exercised live and is not
 * blocked here (see the spike's ratification section), and
 * `gui01-browser-close-does-not-quit` is the registered check that goes red if
 * that ever changes.
 */
@injectable()
export class BrowserWindowCommandContribution implements CommandContribution {

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(OPEN_BROWSER_WINDOW, {
            execute: (url?: string) => this.openBrowserWindow(url),
        });
    }

    /**
     * `url` is optional: with none, the empty string opens the new window on
     * `about:blank`, where the stock address bar is the affordance. Callers
     * that have a URL (plan 01-06's escape action) pass it straight through.
     *
     * A blocked popup returns `null` rather than throwing, which would leave
     * the user staring at nothing with no explanation -- so the null is turned
     * into an error naming this contribution and what to do instead, per the
     * extension's own handler conventions.
     */
    protected openBrowserWindow(url?: string): void {
        const opened = window.open(url ?? '', '_blank');
        if (!opened) {
            throw new Error(
                `${OPEN_BROWSER_WINDOW_COMMAND_ID}: the browser window was blocked and did not open -- ` +
                'invoke the command directly from the command palette (a keypress or click carries the ' +
                'user activation a popup needs) rather than from a script or a delayed handler'
            );
        }
    }
}
