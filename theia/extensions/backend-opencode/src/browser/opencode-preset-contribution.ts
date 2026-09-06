import { inject, injectable } from '@theia/core/shared/inversify';
import type { Disposable, Event } from '@theia/core';
import { CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { Widget } from '@theia/core/lib/browser';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';
import {
    OPENCODE_PRESET_ENABLE_AUTO_ACCEPT,
    OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID,
    OPENCODE_PRESET_USE_GATED,
    OPENCODE_PRESET_USE_GATED_COMMAND_ID,
} from './opencode-preset-commands';

/**
 * 16-02 Task 1: per-session gated/auto-accept preset (D-05, SPEC R3).
 *
 * The preset is strictly per chat session and defaults to gated: a fresh
 * session always opens gated, and auto-accept turns on only through the
 * explicit per-session enable command below (SPEC prohibition). Nothing
 * here is persisted across sessions -- no StorageService, PreferenceService,
 * memento, or DOM storage -- so a dangerous run can never inherit another
 * session's auto-accept. There is no bespoke history widget (D-06):
 * review plus revert reuse the existing Change Set surface.
 */
export type OpenCodePreset = 'gated' | 'auto-accept';

/** Safe default: every session starts here. */
export const OPENCODE_PRESET_DEFAULT: OpenCodePreset = 'gated';

@injectable()
export class OpencodePresetStore {
    protected readonly presets = new Map<string, OpenCodePreset>();
    protected readonly listeners = new Set<() => void>();

    /** Fired whenever any session's preset changes (drives toolbar refresh). */
    readonly onDidChange: Event<void> = (listener: () => void): Disposable => {
        this.listeners.add(listener);
        return { dispose: () => { this.listeners.delete(listener); } };
    };

    /** The session's preset, or the gated default for sessions never touched. */
    getPreset(chatSessionId: string): OpenCodePreset {
        return this.presets.get(chatSessionId) ?? OPENCODE_PRESET_DEFAULT;
    }

    /** Explicit per-session opt-in to auto-accept (the only path off gated). */
    enableAutoAccept(chatSessionId: string): void {
        this.set(chatSessionId, 'auto-accept');
    }

    /** Back to gated for this session only. */
    useGated(chatSessionId: string): void {
        this.set(chatSessionId, 'gated');
    }

    protected set(chatSessionId: string, preset: OpenCodePreset): void {
        if (this.presets.get(chatSessionId) === preset) {
            return;
        }
        this.presets.set(chatSessionId, preset);
        for (const listener of [...this.listeners]) {
            try {
                listener();
            } catch {
                // One bad listener must not break the toggle for the rest.
            }
        }
    }
}

/**
 * Resolve which chat session a preset command targets. Toolbar invocations
 * arrive with the chat view widget (ChatViewWidget.sessionId is public);
 * programmatic callers pass the session id string directly. Anything else
 * resolves to undefined and the command becomes a strict no-op -- the
 * preset is per-session, so without a session there is nothing to switch.
 */
export function resolvePresetSessionId(candidate: unknown): string | undefined {
    if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
    }
    const sessionId = (candidate as { sessionId?: unknown } | undefined)?.sessionId;
    return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : undefined;
}

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
