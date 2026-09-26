/**
 * NG-021..NG-026 (non-GUI wave B): this window's end of the endpoint relay.
 * Registers with the backend hub on start and forwards the kinds the
 * protocol lists -- nothing else -- to chrome through ChromeStoreClient.
 */
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution, WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { ChromeStoreClient } from './chrome-store-client';
import { StoreMessage, StoreReply, TAB_STORE_RELAY_KINDS, TAB_STORE_RELAY_PATH, TabStoreRelayClient, TabStoreRelayServer } from './tab-store-access-protocol';

@injectable()
export class TabStoreRelayContribution implements FrontendApplicationContribution {
    @inject(ChromeStoreClient)
    protected readonly store: ChromeStoreClient;

    @inject(WebSocketConnectionProvider)
    protected readonly connections: WebSocketConnectionProvider;

    onStart(): void {
        // A separate target object, so relay() is the only method the backend can call.
        const target: TabStoreRelayClient = { relay: msg => this.relay(msg) };
        const hub = this.connections.createProxy<TabStoreRelayServer>(TAB_STORE_RELAY_PATH, target);
        hub.register().catch(err => console.warn('[@powerbrowser/tab-uris] tab-store relay registration failed:', err));
    }

    protected async relay(msg: StoreMessage): Promise<StoreReply> {
        if (!msg || !TAB_STORE_RELAY_KINDS.includes(msg.kind)) {
            return { ok: false, reason: 'validation', message: `the relay does not forward ${String(msg && msg.kind)}` };
        }
        return this.store.request(msg);
    }
}
