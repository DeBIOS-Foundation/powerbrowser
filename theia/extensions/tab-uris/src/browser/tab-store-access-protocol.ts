/**
 * NG-021..NG-026 (non-GUI wave B): names the tab-store endpoint (node) and
 * its relay (browser) share, spelled once. Lives under browser/ beside this
 * package's other RPC contracts (group-query-service.ts) and imports nothing
 * browser-only, so the backend imports it too.
 */

/** The access file the endpoint writes into the profile directory, mode 0600. */
export const STORE_ACCESS_FILE_NAME = 'store-access.json';

/** The endpoint's one route: MCP JSON-RPC over HTTP POST. */
export const STORE_ACCESS_ROUTE = '/mcp';

/**
 * Every tool the endpoint lists. scripts/verify-ng-025-store-read-endpoint.mjs
 * derives this list and requires tools/list and docs/tab-store-access.md to
 * match it.
 */
export const TAB_STORE_TOOL_NAMES = [
    'tabs_sql',
    'history_entry',
    'bookmark_by_url',
    'bookmark_folder',
    'sessionstore_tabs',
    'tabs_with_places',
] as const;

export type TabStoreToolName = typeof TAB_STORE_TOOL_NAMES[number];

/** JSON-RPC path of the backend relay hub; every Theia window registers on it. */
export const TAB_STORE_RELAY_PATH = '/services/powerbrowser/tab-store-relay';

/** The actor kinds a window forwards for the endpoint. Nothing else crosses the relay. */
export const TAB_STORE_RELAY_KINDS: readonly string[] = [
    'readHistoryEntry',
    'readBookmarkByUrl',
    'listBookmarkFolder',
    'projectSessionStoreTabs',
    'queryTabsWithPlaces',
];

/** One actor message: the kind plus its fields. */
export interface StoreMessage {
    kind: string;
    [field: string]: unknown;
}

/** The parent's reply: `{ ok: true, kind, ...fields }` or `{ ok: false, reason, message }`. */
export interface StoreReply {
    ok: boolean;
    reason?: string;
    message?: string;
    [field: string]: unknown;
}

/** Implemented by each Theia window; the backend calls it to reach chrome. */
export interface TabStoreRelayClient {
    relay(msg: StoreMessage): Promise<StoreReply>;
}

/** Implemented by the backend hub; a window calls register() once so the hub holds its client. */
export interface TabStoreRelayServer {
    register(): Promise<boolean>;
}
