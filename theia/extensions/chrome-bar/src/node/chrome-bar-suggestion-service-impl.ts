/**
 * GUI-06 (13-02): backend suggestion implementation -- the first
 * `TabQueryService` consumer (12-CODE-REVIEW.md WR-04).
 *
 * Delegates straight to the reader's prefix search over the single readonly
 * handle: opens no profile database anywhere new, projects address and title
 * fields only (the reader's four-field projection), and never throws (the
 * reader resolves empty on failure, which surfaces in the UI as the
 * contracted empty-suggestions copy from 13-UI-SPEC.md).
 */

import { inject, injectable } from '@theia/core/shared/inversify';
import { TabQueryRow, TabQueryService } from '@powerbrowser/tab-uris/lib/node/tab-query-service';
import { ChromeBarSuggestionService } from '../browser/chrome-bar-suggestion-service';

@injectable()
export class ChromeBarSuggestionServiceImpl implements ChromeBarSuggestionService {
    constructor(@inject(TabQueryService) private readonly tabs: TabQueryService) {}

    async searchByPrefix(prefix: string, limit: number): Promise<TabQueryRow[]> {
        return this.tabs.searchByPrefix(prefix, limit);
    }
}
