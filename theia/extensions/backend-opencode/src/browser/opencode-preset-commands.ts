import { Command } from '@theia/core/lib/common';
import type { Disposable, Event } from '@theia/core';

/**
 * 16-02 Task 1: the preset toggle's two commands (D-05).
 *
 * Command-per-action model (modes-commands.ts precedent): each id is a
 * named export so the contribution, the chat-header toolbar items, and the
 * preset gate import the const instead of retyping the string. Both
 * commands are labelless (chrome-bar focus-address precedent) so they stay
 * toggle-invoked from the chat header without inventing palette copy.
 *
 * The per-session preset model lives in this file deliberately: it is pure
 * TypeScript with type-only Theia imports, so the preset gate exercises the
 * shipped store in plain node while the contribution file owns the DOM-side
 * wiring (commands plus toolbar) that needs a browser.
 */
export const OPENCODE_PRESET_USE_GATED_COMMAND_ID = 'powerbrowser.opencode.preset.use-gated';
export const OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID = 'powerbrowser.opencode.preset.enable-auto-accept';

export const OPENCODE_PRESET_USE_GATED: Command = {
    id: OPENCODE_PRESET_USE_GATED_COMMAND_ID,
};

export const OPENCODE_PRESET_ENABLE_AUTO_ACCEPT: Command = {
    id: OPENCODE_PRESET_ENABLE_AUTO_ACCEPT_COMMAND_ID,
};

/**
 * Per-session gated/auto-accept preset (D-05, SPEC R3). Strictly per chat
 * session, defaulting to gated: a fresh session always opens gated, and
 * auto-accept turns on only through the explicit per-session enable
 * command (SPEC prohibition). Nothing here is persisted across sessions --
 * no StorageService, PreferenceService, memento, or DOM storage -- so a
 * dangerous run can never inherit another session's auto-accept. There is
 * no bespoke history widget (D-06): review plus revert reuse the existing
 * Change Set surface.
 */
export type OpenCodePreset = 'gated' | 'auto-accept';

/** Safe default: every session starts here. */
export const OPENCODE_PRESET_DEFAULT: OpenCodePreset = 'gated';

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
