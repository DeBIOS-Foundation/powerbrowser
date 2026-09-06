import { injectable, inject } from '@theia/core/shared/inversify';
import { CommandRegistry } from '@theia/core/lib/common';
import { Widget } from '@theia/core/lib/browser';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { MODES_ACTIVATE_COMMAND_ID } from './modes-commands';
import { registerOrganisingSlot } from './mode-descriptors';
import '../../src/browser/modes.css';

/**
 * GUI-07 (14-02): the organising placeholder slot (Phase-15 canvas out).
 *
 * One centred static panel with the contracted heading, body, and a single
 * stock Theia button that selects Browsing through the imported activate
 * command const (never a re-spelled string). Names render as text, never
 * markup. It paints synchronously with the switch carrying no spinner,
 * skeleton, canvas, tree, drag surface, or failure state. The contribution
 * registers the descriptor slot seam so the organising descriptor's hooks
 * and the mode service share one open and close path; the view opens without
 * activation so tabs keep focus.
 */
@injectable()
export class OrganisingPlaceholderWidget extends Widget {

    static readonly ID = 'powerbrowser.modes.organising-placeholder';

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    constructor() {
        super();
        this.id = OrganisingPlaceholderWidget.ID;
        this.title.label = 'Organising';
        this.title.closable = false;
        this.addClass('pb-modes-organising');
        const slot = document.createElement('div');
        slot.className = 'pb-modes-organising-slot';
        const heading = document.createElement('div');
        heading.className = 'pb-modes-organising-heading';
        heading.textContent = 'Organising arrives next';
        const body = document.createElement('div');
        body.className = 'pb-modes-organising-body';
        body.textContent = 'The freeform canvas for arranging tabs lands in the next update — your tabs stay exactly where they left them.';
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'pb-modes-organising-back theia-button';
        back.textContent = 'Back to Browsing';
        back.onclick = () => {
            void this.backToBrowsing();
        };
        slot.append(heading, body, back);
        this.node.append(slot);
    }

    protected async backToBrowsing(): Promise<void> {
        try {
            await this.commands.executeCommand(MODES_ACTIVATE_COMMAND_ID, 'browsing');
        } catch (error) {
            console.error('[@powerbrowser/modes] back-to-browsing failed:', error);
        }
    }
}

@injectable()
export class OrganisingPlaceholderContribution extends AbstractViewContribution<OrganisingPlaceholderWidget> {

    constructor() {
        super({
            widgetId: OrganisingPlaceholderWidget.ID,
            widgetName: 'Organising',
            defaultWidgetOptions: { area: 'main' },
        });
    }

    onStart(): void {
        registerOrganisingSlot({
            open: () => {
                void this.openView({ activate: false, reveal: true });
            },
            close: () => {
                void this.closeView();
            },
        });
    }
}
