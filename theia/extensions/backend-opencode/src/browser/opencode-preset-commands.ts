import { Command } from '@theia/core/lib/common';

/**
 * 16-02 Task 1: the preset toggle's two commands (D-05).
 *
 * Command-per-action model (modes-commands.ts precedent): each id is a
 * named export so the contribution, the chat-header toolbar items, and the
 * preset gate import the const instead of retyping the string. Both
 * commands are labelless (chrome-bar focus-address precedent) so they stay
 * toggle-invoked from the chat header without inventing palette copy.
 */
export const OPENCODE_PRESET_USE_GATED_COMMAND_ID = 'powerbrowser.opencode.preset.use-gated';
export const OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID = 'powerbrowser.opencode.preset.enable-auto-accept';

export const OPENCODE_PRESET_USE_GATED: Command = {
    id: OPENCODE_PRESET_USE_GATED_COMMAND_ID,
};

export const OPENCODE_PRESET_ENABLE_AUTO_ACCEPT: Command = {
    id: OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID,
};
