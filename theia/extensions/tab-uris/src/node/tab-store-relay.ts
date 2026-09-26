/**
 * NG-021..NG-026 (non-GUI wave B): the endpoint's way to chrome.
 *
 * The backend has no channel to chrome of its own; every Theia window has
 * one, the PowerBrowserGroup actor. Each window registers here on start, and
 * the endpoint's Places, sessionstore and write tools are relayed to the
 * newest live window, which forwards them through ChromeStoreClient. Chrome
 * stays the only party that reads Places or writes tabs.sqlite.
 */
import { injectable } from '@theia/core/shared/inversify';
import { RpcProxy } from '@theia/core/lib/common/messaging/proxy-factory';
import { StoreMessage, StoreReply, TabStoreRelayClient } from '../browser/tab-store-access-protocol';

@injectable()
export class TabStoreRelayHub {
    protected readonly clients: RpcProxy<TabStoreRelayClient>[] = [];

    add(client: RpcProxy<TabStoreRelayClient>): void {
        this.clients.push(client);
        client.onDidCloseConnection(() => {
            const index = this.clients.indexOf(client);
            if (index >= 0) {
                this.clients.splice(index, 1);
            }
        });
    }

    /** Resolves chrome's reply; rejects when no window is connected. */
    async relay(msg: StoreMessage): Promise<StoreReply> {
        for (const client of [...this.clients].reverse()) {
            try {
                return await client.relay(msg);
            } catch {
                // That window's connection dropped mid-call; the next one answers.
            }
        }
        throw new Error('no Power Browser window is connected; open one and retry');
    }
}
