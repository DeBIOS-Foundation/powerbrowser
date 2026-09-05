/**
 * SQL-01 (12-01): the browser-tab row-key rule, beside the registry.
 *
 * Stock browser tabs have no `TabUriRegistry.uriOf` emission (that direction
 * reads Theia widget descriptions), so the chrome-side writer keys their
 * rows with this one-line rule instead: the `webview:` scheme spelling from
 * `existing-scheme-coverage.ts` plus the tab URL spec, treated as an opaque
 * string and never parsed.
 *
 * Deliberately zero imports from `./tab-uri-registry` and zero new public
 * members on `TabUriRegistry`: the registry's exported shape is the frozen
 * bridge contract asserted by `scripts/verify-registry-shape.mjs`, so the
 * rule lives here, beside it. The same one-line rule is implemented
 * chrome-side by `PowerBrowserAPI.browserTabKey`; the roundtrip proof
 * (`scripts/verify-sql-store-roundtrip.mjs`) asserts both spell the same
 * scheme.
 */

/** The scheme prefix every browser-tab row key carries. */
export const BROWSER_TAB_KEY_SCHEME = 'webview';

/**
 * The row key for a stock browser tab: scheme prefix plus URL spec.
 * Pure, total, and opaque -- callers bind the result, never parse it.
 */
export function browserTabKeyOf(urlSpec: string): string {
    return 'webview:' + urlSpec;
}
