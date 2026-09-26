/**
 * NG-021/NG-022 (non-GUI wave B): Theia's reader for chrome-owned stores --
 * history, bookmarks, bookmark folders and the sessionstore projection --
 * through the PowerBrowserGroup actor.
 *
 * Same wire as GroupActorClient and WebTabChannel: a PowerBrowserGroupRequest
 * DOM event out, a PowerBrowserGroupResponse event back, matched by
 * requestId. The event names are spelled locally because the canonical
 * exports live in @powerbrowser/modes, which depends on this package. The
 * parent dispatches these kinds in handleStoreRequest, not handleGroupMutation.
 */
import { injectable } from '@theia/core/shared/inversify';
import { StoreMessage, StoreReply } from './tab-store-access-protocol';

const GROUP_REQUEST_EVENT = 'PowerBrowserGroupRequest';
const GROUP_RESPONSE_EVENT = 'PowerBrowserGroupResponse';

/** Ack timeout for a read. */
export const STORE_ACK_TIMEOUT_MS = 8000;

export interface HistoryEntry {
    url: string;
    title: string;
}

export interface BookmarkEntry {
    guid: string;
    title: string;
    url: string;
}

export interface SessionTabRow {
    uri: string;
    url: string;
    title: string;
    last_active: number;
}

@injectable()
export class ChromeStoreClient {
    private seq = 0;

    /** One request; resolves the parent's reply or a timeout reply, never rejects. */
    request(msg: StoreMessage, timeoutMs = STORE_ACK_TIMEOUT_MS): Promise<StoreReply> {
        const requestId = `store-${msg.kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
        return new Promise<StoreReply>(resolve => {
            const settle = (reply: StoreReply): void => {
                window.removeEventListener(GROUP_RESPONSE_EVENT, onResponse);
                window.clearTimeout(timer);
                resolve(reply);
            };
            const onResponse = (event: Event): void => {
                const detail = (event as CustomEvent).detail as { requestId?: unknown; reply?: unknown } | undefined;
                if (!detail || detail.requestId !== requestId) {
                    return;
                }
                settle(detail.reply && typeof detail.reply === 'object'
                    ? detail.reply as StoreReply
                    : { ok: false, reason: 'validation', message: 'malformed reply' });
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout', message: `no reply to ${msg.kind}` }), timeoutMs);
            window.addEventListener(GROUP_RESPONSE_EVENT, onResponse);
            // document + bubbles: the actor child listens on the window root (GroupActorClient records why).
            document.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));
        });
    }

    readHistoryEntry(url: string): Promise<HistoryEntry | null> {
        return this.field<HistoryEntry | null>({ kind: 'readHistoryEntry', url }, 'entry');
    }

    readBookmarkByUrl(url: string): Promise<BookmarkEntry | null> {
        return this.field<BookmarkEntry | null>({ kind: 'readBookmarkByUrl', url }, 'bookmark');
    }

    listBookmarkFolder(folderGuid: string): Promise<BookmarkEntry[]> {
        return this.field<BookmarkEntry[]>({ kind: 'listBookmarkFolder', folderGuid }, 'rows');
    }

    projectSessionStoreTabs(): Promise<SessionTabRow[]> {
        return this.field<SessionTabRow[]>({ kind: 'projectSessionStoreTabs' }, 'rows');
    }

    protected async field<T>(msg: StoreMessage, name: string, timeoutMs?: number): Promise<T> {
        const reply = await this.request(msg, timeoutMs);
        if (!reply.ok) {
            throw new Error(reply.message ?? `${msg.kind} failed (${reply.reason ?? 'store'})`);
        }
        return reply[name] as T;
    }
}
