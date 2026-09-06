/**
 * GUI-08 (15-01): Theia-side half of the PowerBrowserGroup mutation channel.
 *
 * The frontend is unprivileged web content -- it cannot touch the actor --
 * so each mutation goes out as a `PowerBrowserGroupRequest` DOM CustomEvent
 * carrying { requestId, msg }, and the chrome-side child answers with a
 * `PowerBrowserGroupResponse` event carrying { requestId, reply }. This
 * correlator matches answers to callers by requestId with a 5s ack timeout
 * (15-RESEARCH.md OQ1); a nack or timeout rejects, and the GroupModel turns
 * that into the contracted save-error bar with Retry. With no chrome host
 * (plain Theia dev), every mutation times out rather than hanging -- the
 * same bar, honestly.
 */

import { injectable } from '@theia/core/shared/inversify';

/** Wire event names shared with `GroupActorChild.sys.mjs` (chrome side). */
export const GROUP_REQUEST_EVENT = 'PowerBrowserGroupRequest';
export const GROUP_RESPONSE_EVENT = 'PowerBrowserGroupResponse';

/** Ack timeout per mutation: matches the sidecar health-timeout scale. */
export const GROUP_ACTOR_ACK_TIMEOUT_MS = 5000;

/** The 8 message kinds the parent dispatch (`handleGroupMutation`) serves. */
export type GroupMutation =
    | { kind: 'createGroup'; id: string; title?: string; x?: number; y?: number; w?: number; h?: number; isActive?: boolean }
    | { kind: 'setTabGroup'; uri: string; groupId: string | null }
    | { kind: 'moveGroup'; id: string; x: number; y: number }
    | { kind: 'resizeGroup'; id: string; w: number; h: number }
    | { kind: 'renameGroup'; id: string; title: string }
    | { kind: 'dissolveGroup'; id: string }
    | { kind: 'closeGroup'; id: string }
    | { kind: 'setActiveGroup'; id: string };

/** Parent ack shape: `{ ok: true, ...echo } | { ok: false, reason }`. */
export interface GroupReply {
    ok: boolean;
    reason?: 'validation' | 'store';
    message?: string;
    [key: string]: unknown;
}

/** Rejection when a mutation is nacked or the ack never arrives. */
export class GroupWriteError extends Error {
    constructor(
        message: string,
        readonly reason: 'validation' | 'store' | 'timeout'
    ) {
        super(message);
        this.name = 'GroupWriteError';
    }
}

@injectable()
export class GroupActorClient {
    private seq = 0;
    private readonly pending = new Map<string, { resolve: (reply: GroupReply) => void; reject: (err: Error) => void; timer: number }>();
    private listening = false;

    /**
     * Sends one mutation and resolves with the parent ack. Rejects with
     * GroupWriteError on nack or after the ack timeout -- never hangs, never
     * throws synchronously.
     */
    mutate(msg: GroupMutation): Promise<GroupReply> {
        this.ensureListening();
        const requestId = `group-${Date.now().toString(36)}-${(this.seq += 1)}`;
        window.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { detail: { requestId, msg } }));
        return new Promise<GroupReply>((resolve, reject) => {
            const timer = window.setTimeout(() => {
                this.pending.delete(requestId);
                reject(new GroupWriteError(`GroupActorClient: ack timeout for ${msg.kind}`, 'timeout'));
            }, GROUP_ACTOR_ACK_TIMEOUT_MS);
            this.pending.set(requestId, { resolve, reject, timer });
        });
    }

    private ensureListening(): void {
        if (this.listening) {
            return;
        }
        this.listening = true;
        window.addEventListener(GROUP_RESPONSE_EVENT, this.onResponse);
    }

    private readonly onResponse = (event: Event): void => {
        try {
            const detail = (event as CustomEvent).detail as { requestId?: unknown; reply?: unknown } | undefined;
            const requestId = detail?.requestId;
            const reply = detail?.reply as GroupReply | undefined;
            if (typeof requestId !== 'string' || !reply || typeof reply !== 'object') {
                return;
            }
            const waiter = this.pending.get(requestId);
            if (!waiter) {
                return;
            }
            this.pending.delete(requestId);
            window.clearTimeout(waiter.timer);
            if (reply.ok) {
                waiter.resolve(reply);
            } else {
                waiter.reject(new GroupWriteError(
                    typeof reply.message === 'string' && reply.message ? reply.message : `group write rejected (${reply.reason ?? 'store'})`,
                    reply.reason === 'validation' ? 'validation' : 'store'
                ));
            }
        } catch (error) {
            console.error('[@powerbrowser/modes] group response dispatch failed:', error);
        }
    };
}
