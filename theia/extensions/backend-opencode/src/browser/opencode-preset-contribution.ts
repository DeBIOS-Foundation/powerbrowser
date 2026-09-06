import { inject, injectable } from '@theia/core/shared/inversify';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { Widget } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';
import {
    OPENCODE_PRESET_ENABLE_AUTO_ACCEPT,
    OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID,
    OPENCODE_PRESET_USE_GATED,
    OPENCODE_PRESET_USE_GATED_COMMAND_ID,
    OpencodePresetStore,
    resolvePresetSessionId,
} from './opencode-preset-commands';

@injectable()
export class OpencodePresetContribution implements CommandContribution, TabBarToolbarContribution {
    @inject(OpencodePresetStore)
    protected readonly store: OpencodePresetStore;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(OPENCODE_PRESET_USE_GATED, {
            execute: (candidate?: unknown) => {
                const sessionId = resolvePresetSessionId(candidate);
                if (sessionId !== undefined) {
                    this.store.useGated(sessionId);
                }
            },
            isToggled: (candidate?: unknown) =>
                this.store.getPreset(resolvePresetSessionId(candidate) ?? '') !== 'auto-accept',
        });
        commands.registerCommand(OPENCODE_PRESET_ENABLE_AUTO_ACCEPT, {
            execute: (candidate?: unknown) => {
                const sessionId = resolvePresetSessionId(candidate);
                if (sessionId !== undefined) {
                    this.store.enableAutoAccept(sessionId);
                }
            },
            isToggled: (candidate?: unknown) =>
                this.store.getPreset(resolvePresetSessionId(candidate) ?? '') === 'auto-accept',
        });
    }

    /**
     * Surface the toggle in the chat header area: both items render only on
     * the chat view widget (ChatViewWidget.ID) and refresh through the
     * store's change event, so the header always shows the acting session's
     * preset. Tooltips carry the meaning; the commands stay labelless.
     */
    registerToolbarItems(registry: TabBarToolbarRegistry): void {
        registry.registerItem({
            id: OPENCODE_PRESET_USE_GATED_COMMAND_ID,
            command: OPENCODE_PRESET_USE_GATED_COMMAND_ID,
            tooltip: 'Gated review: each OpenCode edit waits for your accept',
            text: '$(shield)',
            group: 'opencode-preset',
            priority: 20,
            isVisible: (widget?: Widget) => !!widget && widget.id === ChatViewWidget.ID,
            onDidChange: this.store.onDidChange,
        });
        registry.registerItem({
            id: OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID,
            command: OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID,
            tooltip: 'Auto-accept: OpenCode edits apply immediately, reviewable from history',
            text: '$(zap)',
            group: 'opencode-preset',
            priority: 21,
            isVisible: (widget?: Widget) => !!widget && widget.id === ChatViewWidget.ID,
            onDidChange: this.store.onDidChange,
        });
    }
}
