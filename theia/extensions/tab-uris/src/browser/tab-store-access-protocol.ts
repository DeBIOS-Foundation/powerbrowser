/**
 * NG-025/NG-026 (non-GUI wave B): names the tab-store endpoint (node) and its
 * relay (browser) share, spelled once. Lives under browser/ beside this
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
] as const;

export type TabStoreToolName = typeof TAB_STORE_TOOL_NAMES[number];
