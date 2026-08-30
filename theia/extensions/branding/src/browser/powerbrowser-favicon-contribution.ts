import { injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { SOURCERER_MARK_DATA_URI } from './sourcerer-mark';

// Theia emits no favicon of its own (verified: zero `favicon` references
// across `dev-packages` and `packages/core/src`, D-36) so there is nothing
// to remove first and no dispose/re-append cycle is needed. `onStart` runs
// after every core style contribution and before `attachShell`, so the icon
// is present on first paint.
@injectable()
export class SourcererFaviconContribution implements FrontendApplicationContribution {
    onStart(): void {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = SOURCERER_MARK_DATA_URI;
        document.head.appendChild(link);
    }
}
