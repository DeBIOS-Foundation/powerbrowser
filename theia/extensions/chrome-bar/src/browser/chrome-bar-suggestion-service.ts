/**
 * GUI-06 (13-02): frontend suggestion-service contract for the chrome bar.
 *
 * The address pill (widget lands in 13-03) reads suggestions through this
 * interface, never by opening `tabs.sqlite` itself -- the Theia backend's
 * `TabQueryService` holds the single readonly handle and stays the sole
 * reader. The RPC path constant lives here so the verify row in
 * `scripts/verify-chrome-bar-suggestions.mjs` derives it from this source
 * instead of duplicating the string.
 */

import type { TabQueryRow } from '@powerbrowser/tab-uris/lib/node/tab-query-service';

/** JSON-RPC path the backend suggestion handler serves on. */
export const CHROME_SUGGESTION_PATH = '/services/powerbrowser/chrome-suggestions';

/** UI cap: the dropdown never shows more than this many rows. */
export const CHROME_SUGGESTION_LIMIT = 8;

/** Prefix search over tab rows, newest first, capped at `limit` rows. */
export interface ChromeBarSuggestionService {
    searchByPrefix(prefix: string, limit: number): Promise<TabQueryRow[]>;
}

export const ChromeBarSuggestionService = Symbol('ChromeBarSuggestionService');
