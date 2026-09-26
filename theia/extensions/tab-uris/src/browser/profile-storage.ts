import { inject, injectable } from '@theia/core/shared/inversify';
import { Emitter, Event as TheiaEvent, WaitUntilEvent } from '@theia/core/lib/common';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { ShellLayoutRestorer } from '@theia/core/lib/browser/shell/shell-layout-restorer';
import { LocalStorageService, StorageService } from '@theia/core/lib/browser/storage-service';
import { WEB_TAB_STATE_EVENT } from './web-tab';

/**
 * NG-033: Theia's StorageService, kept in the browser profile instead of the
 * frontend origin's localStorage.
 *
 * The sidecar's first spawn asks for port 0 (TheiaService.sys.mjs:602), so the
 * frontend origin -- and localStorage with it -- changes on nearly every
 * launch: the active mode, the per-mode layouts and the shell layout (stock
 * ShellLayoutRestorer's 'perspective-layouts') were lost on relaunch. This
 * service keeps one JSON map per profile, which chrome writes to
 * <profile>/powerbrowser-shell-state.json over the PowerBrowserGroup actor
 * (PowerBrowserAPI.handleShellMessage). The actor, not the backend: a
 * user-storage read awaited inside layout restore deadlocks against the RPC
 * connection (customize-css-contribution.ts header).
 *
 * With no shell chrome behind the page -- the dev app on localhost:3000, or a
 * sender the actor refuses -- the first request is not taken or is refused,
 * and the service uses LocalStorageService for the rest of the session, so the
 * page never waits on a channel that is not there.
 */
export const SHELL_STATE_REQUEST_EVENT = 'PowerBrowserGroupRequest';
export const SHELL_STATE_RESPONSE_EVENT = 'PowerBrowserGroupResponse';
export const SHELL_STATE_ACK_TIMEOUT_MS = 5000;
export const SHELL_STATE_SAVE_DELAY_MS = 500;
/** The push chrome sends to ask for a flush before a quit (PowerBrowserAPI.flushShellState). */
export const SHELL_FLUSH_KIND = 'flushShellState';

interface ShellStateReply {
    ok: boolean;
    state?: string;
    reason?: string;
    message?: string;
}

type ShellStateMessage =
    | { kind: 'shellStateLoad' }
    | { kind: 'shellStateSave'; state: string }
    | { kind: 'shellFlushed'; flushId: string };

const NO_CHROME = 'no-chrome';
type ShellStateOutcome = ShellStateReply | typeof NO_CHROME;

@injectable()
export class ProfileStorageService implements StorageService {

    @inject(LocalStorageService)
    protected readonly fallback: LocalStorageService;

    protected readonly onWillFlushEmitter = new Emitter<WaitUntilEvent>();
    /** Fired at the start of a quit flush; listeners add their last writes with waitUntil. */
    readonly onWillFlush: TheiaEvent<WaitUntilEvent> = this.onWillFlushEmitter.event;

    protected map: Promise<Record<string, unknown> | undefined> | undefined;
    protected saveTimer: number | undefined;
    protected seq = 0;

    async setData<T>(key: string, data?: T): Promise<void> {
        const map = await this.load();
        if (!map) {
            return this.fallback.setData(key, data);
        }
        if (data === undefined) {
            delete map[key];
        } else {
            map[key] = data;
        }
        this.scheduleSave();
    }

    async getData<T>(key: string, defaultValue: T): Promise<T>;
    async getData<T>(key: string): Promise<T | undefined>;
    async getData<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const map = await this.load();
        if (!map) {
            return this.fallback.getData(key, defaultValue);
        }
        return Object.prototype.hasOwnProperty.call(map, key) ? map[key] as T : defaultValue;
    }

    /** Runs the onWillFlush listeners (bounded), so their writes are in the map before save(). */
    async fireWillFlush(): Promise<void> {
        await WaitUntilEvent.fire(this.onWillFlushEmitter, {}, 3000);
    }

    /**
     * Sends the whole map to chrome now; true on chrome's ack. A setData made
     * just before this call is in the map: both await the same resolved load,
     * and microtasks run in order.
     */
    async save(): Promise<boolean> {
        if (this.saveTimer !== undefined) {
            window.clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
        const map = await this.load();
        if (!map) {
            return false;
        }
        const reply = await this.request({ kind: 'shellStateSave', state: JSON.stringify(map) });
        if (reply === NO_CHROME || !reply.ok) {
            console.error('[@powerbrowser/tab-uris] shell state save failed:', reply === NO_CHROME ? NO_CHROME : reply.message ?? reply.reason);
            return false;
        }
        return true;
    }

    /** Tells chrome the flush it asked for is done (PowerBrowserAPI.flushShellState waits on it). */
    async acknowledgeFlush(flushId: string): Promise<void> {
        await this.request({ kind: 'shellFlushed', flushId });
    }

    protected load(): Promise<Record<string, unknown> | undefined> {
        if (!this.map) {
            this.map = this.request({ kind: 'shellStateLoad' }).then(reply => {
                if (reply === NO_CHROME || !reply.ok) {
                    return undefined;
                }
                try {
                    const parsed: unknown = JSON.parse(typeof reply.state === 'string' && reply.state ? reply.state : '{}');
                    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
                } catch {
                    return {};
                }
            });
        }
        return this.map;
    }

    protected scheduleSave(): void {
        if (this.saveTimer !== undefined) {
            return;
        }
        this.saveTimer = window.setTimeout(() => {
            this.saveTimer = undefined;
            void this.save();
        }, SHELL_STATE_SAVE_DELAY_MS);
    }

    protected request(msg: ShellStateMessage): Promise<ShellStateOutcome> {
        return new Promise<ShellStateOutcome>(resolve => {
            const requestId = `shell-state-${msg.kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
            const settle = (reply: ShellStateOutcome): void => {
                window.removeEventListener(SHELL_STATE_RESPONSE_EVENT, onResponse);
                window.clearTimeout(timer);
                resolve(reply);
            };
            const onResponse = (event: Event): void => {
                const detail = (event as CustomEvent).detail as { requestId?: unknown; reply?: unknown } | undefined;
                if (!detail || detail.requestId !== requestId) {
                    return;
                }
                settle(detail.reply && typeof detail.reply === 'object'
                    ? detail.reply as ShellStateReply
                    : { ok: false, reason: 'validation', message: 'malformed reply' });
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout' }), SHELL_STATE_ACK_TIMEOUT_MS);
            window.addEventListener(SHELL_STATE_RESPONSE_EVENT, onResponse);
            // cancelable, and the return value read: the actor child calls
            // preventDefault synchronously once chrome has the request
            // (GroupActorChild.handleEvent), the same signal
            // browser-window-command.ts decides its fallback on. Not prevented
            // means no shell chrome is behind this page.
            const taken = !document.dispatchEvent(new CustomEvent(SHELL_STATE_REQUEST_EVENT, {
                bubbles: true,
                cancelable: true,
                detail: { requestId, msg },
            }));
            if (!taken) {
                settle(NO_CHROME);
            }
        });
    }
}

/**
 * NG-032/NG-033: answers chrome's quit flush. Chrome holds the quit
 * (TheiaService._holdQuitForFlush) and pushes { kind: 'flushShellState',
 * flushId } on the web-tab state channel; this runs the onWillFlush listeners
 * (the session snapshot), stores the shell layout through the stock restorer,
 * saves the map, and acknowledges -- all while the backend still runs. A
 * flush that arrives before the frontend is ready stores nothing (a half-built
 * layout must not overwrite the saved one) and still acknowledges, so the
 * quit is never held for it.
 */
@injectable()
export class ShellStateFlushContribution implements FrontendApplicationContribution {

    @inject(ProfileStorageService)
    protected readonly storage: ProfileStorageService;

    @inject(ShellLayoutRestorer)
    protected readonly layoutRestorer: ShellLayoutRestorer;

    @inject(FrontendApplicationStateService)
    protected readonly stateService: FrontendApplicationStateService;

    onStart(app: FrontendApplication): void {
        window.addEventListener(WEB_TAB_STATE_EVENT, event => {
            const detail = (event as CustomEvent).detail as { kind?: unknown; flushId?: unknown } | undefined;
            if (!detail || detail.kind !== SHELL_FLUSH_KIND || typeof detail.flushId !== 'string') {
                return;
            }
            void this.flush(app, detail.flushId);
        });
    }

    protected async flush(app: FrontendApplication, flushId: string): Promise<void> {
        try {
            if (this.stateService.state === 'ready') {
                await this.storage.fireWillFlush();
                this.layoutRestorer.storeLayout(app);
                await this.storage.save();
            }
        } catch (error) {
            console.error('[@powerbrowser/tab-uris] shell state flush failed:', error);
        } finally {
            await this.storage.acknowledgeFlush(flushId);
        }
    }
}
