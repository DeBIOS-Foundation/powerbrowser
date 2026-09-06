/**
 * GUI-08 (15-01): the Panorama organising commands (tracer slice).
 *
 * Command-per-action model (chrome-bar-commands.ts / modes-commands.ts
 * precedent): each id is a named export so call sites (the organising
 * widget's toolbar, box headers, tree rows, error bar) import the const
 * instead of retyping the string. Only New Group carries a label -- it is
 * the toolbar CTA with 15-UI-SPEC.md's contracted "New Group" copy
 * verbatim; close, view-flip, and retry stay labelless, invoked from the
 * widget surface that already names them.
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';

export const PANORAMA_NEW_GROUP_COMMAND_ID = 'powerbrowser.panorama.new-group';
export const PANORAMA_CLOSE_GROUP_COMMAND_ID = 'powerbrowser.panorama.close-group';
export const PANORAMA_SHOW_CANVAS_COMMAND_ID = 'powerbrowser.panorama.show-canvas';
export const PANORAMA_SHOW_TREE_COMMAND_ID = 'powerbrowser.panorama.show-tree';
export const PANORAMA_RETRY_SAVE_COMMAND_ID = 'powerbrowser.panorama.retry-save';

export const PANORAMA_NEW_GROUP: Command = {
    id: PANORAMA_NEW_GROUP_COMMAND_ID,
    label: 'New Group',
};

export const PANORAMA_CLOSE_GROUP: Command = {
    id: PANORAMA_CLOSE_GROUP_COMMAND_ID,
};

export const PANORAMA_SHOW_CANVAS: Command = {
    id: PANORAMA_SHOW_CANVAS_COMMAND_ID,
};

export const PANORAMA_SHOW_TREE: Command = {
    id: PANORAMA_SHOW_TREE_COMMAND_ID,
};

export const PANORAMA_RETRY_SAVE: Command = {
    id: PANORAMA_RETRY_SAVE_COMMAND_ID,
};

export const PANORAMA_COMMAND_IDS = [
    PANORAMA_NEW_GROUP_COMMAND_ID,
    PANORAMA_CLOSE_GROUP_COMMAND_ID,
    PANORAMA_SHOW_CANVAS_COMMAND_ID,
    PANORAMA_SHOW_TREE_COMMAND_ID,
    PANORAMA_RETRY_SAVE_COMMAND_ID,
];

/** Implemented by the organising widget contribution (wired in the module). */
export const PanoramaCommandHandler = Symbol('PanoramaCommandHandler');
export interface PanoramaCommandHandler {
    newGroup(): Promise<void>;
    closeGroup(id: string): Promise<void>;
    showCanvas(): void;
    showTree(): void;
    retrySave(): Promise<void>;
}

@injectable()
export class PanoramaCommandContribution implements CommandContribution {
    @inject(PanoramaCommandHandler)
    protected readonly handler: PanoramaCommandHandler;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(PANORAMA_NEW_GROUP, {
            execute: () => this.handler.newGroup(),
        });
        commands.registerCommand(PANORAMA_CLOSE_GROUP, {
            execute: (id: string | undefined) => this.handler.closeGroup(typeof id === 'string' ? id : ''),
        });
        commands.registerCommand(PANORAMA_SHOW_CANVAS, {
            execute: () => this.handler.showCanvas(),
        });
        commands.registerCommand(PANORAMA_SHOW_TREE, {
            execute: () => this.handler.showTree(),
        });
        commands.registerCommand(PANORAMA_RETRY_SAVE, {
            execute: () => this.handler.retrySave(),
        });
    }
}
