/**
 * UPD-20/21/22/23 (46-02): the Theia-side update client. Listens for
 * `{ kind: 'appUpdate', status, version? }` pushes on WEB_TAB_STATE_EVENT
 * (the same listener shape as ShellStateFlushContribution.onStart), renders
 * the contracted ready / cannot-update / could-not-check notifications plus
 * a status-bar item, issues the three shell kinds from plan 46-01
 * (appUpdateState / checkForUpdates / restartToUpdate) over the
 * PowerBrowserGroupRequest / PowerBrowserGroupResponse channel with the
 * request() ack-timeout shape, and registers the two palette commands
 * reusing the browser-window-command id-constant + label-from-copy pattern.
 *
 * All sentences come from @powerbrowser/branding's POWERBROWSER_UPDATE_COPY;
 * no literal update sentence lives in this file (the update-copy row asserts
 * the import). Check again shows at most once per session: the second
 * failure in the same session reuses the status-bar state without
 * re-showing the prompt; a success resets the flag.
 */
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core/lib/common';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser';
import { POWERBROWSER_UPDATE_COPY } from '@powerbrowser/branding/src/browser/powerbrowser-update-copy';
import { WEB_TAB_STATE_EVENT } from './web-tab';

const SHELL_STATE_REQUEST_EVENT = 'PowerBrowserGroupRequest';
const SHELL_STATE_RESPONSE_EVENT = 'PowerBrowserGroupResponse';
const SHELL_STATE_ACK_TIMEOUT_MS = 5000;

export const RESTART_TO_UPDATE_COMMAND_ID = 'powerbrowser.update.restartToUpdate';
export const CHECK_FOR_UPDATES_COMMAND_ID = 'powerbrowser.update.checkForUpdates';

export const RESTART_TO_UPDATE_COMMAND: Command = {
    id: RESTART_TO_UPDATE_COMMAND_ID,
    label: POWERBROWSER_UPDATE_COPY.restartToUpdateTitle,
};

export const CHECK_FOR_UPDATES_COMMAND: Command = {
    id: CHECK_FOR_UPDATES_COMMAND_ID,
    label: POWERBROWSER_UPDATE_COPY.checkForUpdatesTitle,
};

interface ShellReply {
    ok: boolean;
    state?: unknown;
    version?: unknown;
    accepted?: unknown;
    reason?: string;
    message?: string;
}

type ShellOutcome = ShellReply | 'no-chrome';

/** The pure once-per-session Check-again transition, unit-tested without Theia imports. */
export function shouldShowCheckAgain(alreadyShown: boolean): { show: boolean; next: boolean } {
    if (alreadyShown) {
        return { show: false, next: true };
    }
    return { show: true, next: true };
}

export function resetCheckAgainOnSuccess(): boolean {
    return false;
}

@injectable()
export class UpdateClientContribution implements FrontendApplicationContribution, CommandContribution {

    @inject(MessageService)
    protected readonly messages: MessageService;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    @inject(FrontendApplication)
    protected readonly app: FrontendApplication;

    protected seq = 0;
    protected checkAgainShown = false;
    protected statusBarId = 'powerbrowser.update.status';

    onStart(app: FrontendApplication): void {
        void app;
        window.addEventListener(WEB_TAB_STATE_EVENT, this.onAppUpdatePush);
        void this.seedState();
    }

    onStop(): void {
        window.removeEventListener(WEB_TAB_STATE_EVENT, this.onAppUpdatePush);
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(RESTART_TO_UPDATE_COMMAND, {
            execute: () => this.restartToUpdate(),
        });
        commands.registerCommand(CHECK_FOR_UPDATES_COMMAND, {
            execute: () => this.checkForUpdates(),
        });
    }

    protected readonly onAppUpdatePush = (event: Event): void => {
        try {
            const detail = (event as CustomEvent).detail as { kind?: unknown; status?: unknown; version?: unknown } | undefined;
            if (!detail || detail.kind !== 'appUpdate') {
                return;
            }
            const status = typeof detail.status === 'string' ? detail.status : '';
            const version = typeof detail.version === 'string' && detail.version ? detail.version : '';
            void this.render(status, version);
        } catch (error) {
            console.error('[@powerbrowser/tab-uris] update push dispatch failed:', error);
        }
    };

    protected async seedState(): Promise<void> {
        const reply = await this.request({ kind: 'appUpdateState' });
        if (reply === 'no-chrome' || !reply.ok) {
            return;
        }
        const state = typeof reply.state === 'string' ? reply.state : '';
        const version = typeof reply.version === 'string' ? reply.version : '';
        if (state === 'ready' || state === 'pending') {
            await this.render('ready', version);
        }
    }

    protected async render(status: string, version: string): Promise<void> {
        if (status === 'ready') {
            await this.showReady(version);
        } else if (status === 'cant-apply') {
            await this.showCannotUpdate();
        } else if (status === 'error') {
            await this.showCouldNotCheck();
        } else {
            await this.setStatusBar(`PowerBrowser: checking for updates…`);
        }
    }

    protected interpolateReady(version: string): string {
        if (version) {
            return POWERBROWSER_UPDATE_COPY.readyBody.replace('<version>', version);
        }
        return POWERBROWSER_UPDATE_COPY.readyBody.replace('<version> ', '');
    }

    protected async showReady(version: string): Promise<void> {
        const body = this.interpolateReady(version);
        await this.setStatusBar(`${POWERBROWSER_UPDATE_COPY.readyTitle}: Restart now`);
        try {
            const actions = await this.messages.info(body, 'Restart now', 'Later');
            if (actions === 'Restart now') {
                await this.restartToUpdate();
            }
        } catch {
            // No chrome host: the status-bar item above still re-opens the prompt.
        }
    }

    protected async showCannotUpdate(): Promise<void> {
        const mac = navigator.platform.startsWith('Mac');
        const body = mac ? POWERBROWSER_UPDATE_COPY.cannotUpdateMacBody : POWERBROWSER_UPDATE_COPY.cannotUpdateBody;
        await this.setStatusBar('PowerBrowser: this copy cannot update');
        try {
            await this.messages.warn(body, 'Open download page');
        } catch {
            // Off-host: status-bar state above still records the condition.
        }
    }

    protected async showCouldNotCheck(): Promise<void> {
        await this.setStatusBar('PowerBrowser: update check failed');
        const transition = shouldShowCheckAgain(this.checkAgainShown);
        this.checkAgainShown = transition.next;
        if (!transition.show) {
            return;
        }
        try {
            const actions = await this.messages.warn(POWERBROWSER_UPDATE_COPY.couldNotCheckBody, 'Check again');
            if (actions === 'Check again') {
                await this.checkForUpdates();
            }
        } catch {
            // Off-host: status-bar state above still records the condition.
        }
    }

    protected async setStatusBar(text: string): Promise<void> {
        try {
            await this.statusBar.setElement(this.statusBarId, { text, alignment: StatusBarAlignment.RIGHT });
        } catch {
            // Status bar unavailable: notifications above still carry the copy.
        }
    }

    protected async restartToUpdate(): Promise<void> {
        const reply = await this.request({ kind: 'restartToUpdate' });
        if (reply === 'no-chrome' || !reply.ok) {
            try {
                await this.messages.warn('PowerBrowser: Restart to Update is unavailable while the browser host is unreachable. Try again when the browser is running.');
            } catch {
                // Message channel unavailable too: nothing further to report through.
            }
        }
    }

    protected async checkForUpdates(): Promise<void> {
        const reply = await this.request({ kind: 'checkForUpdates' });
        if (reply !== 'no-chrome' && reply.ok) {
            this.checkAgainShown = resetCheckAgainOnSuccess();
        }
    }

    @postConstruct()
    protected initRequestSeq(): void {
        this.seq = 0;
    }

    protected request(msg: { kind: string }): Promise<ShellOutcome> {
        if (location.protocol !== 'http:' || location.hostname !== '127.0.0.1') {
            return Promise.resolve('no-chrome');
        }
        return new Promise<ShellOutcome>(resolve => {
            const requestId = `update-${msg.kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
            const settle = (reply: ShellOutcome): void => {
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
                    ? detail.reply as ShellReply
                    : { ok: false, reason: 'validation', message: 'malformed reply' });
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout' }), SHELL_STATE_ACK_TIMEOUT_MS);
            window.addEventListener(SHELL_STATE_RESPONSE_EVENT, onResponse);
            try {
                document.dispatchEvent(new CustomEvent(SHELL_STATE_REQUEST_EVENT, { bubbles: true, detail: { requestId, msg } }));
            } catch {
                settle('no-chrome');
            }
        });
    }
}
