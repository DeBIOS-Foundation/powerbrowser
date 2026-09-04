import { injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { POWERBROWSER_MARK_DATA_URI } from './powerbrowser-mark';
import { readBrandingConfig } from './powerbrowser-branding-config';

// Theia emits no favicon of its own (verified: zero `favicon` references
// across `dev-packages` and `packages/core/src`, D-36) so there is nothing
// to remove first and no dispose/re-append cycle is needed. `onStart` runs
// after every core style contribution and before `attachShell`, so the icon
// is present on first paint.
//
// GEN-05 (04-04): the icon bytes are the RUNTIME powerbrowserBranding.markSvg
// value -- the mark SVG the generator owns from brand/mark.svg -- encoded
// exactly the way the compiled twin below is built, with that twin as the
// boot fallback where the provider is unset. The OS-driven
// prefers-color-scheme dual fill this surface needs is IN the channel SVG
// (it is the same file's bytes), so the theme split the preflight asserts
// -- favicon follows the OS, in-shell follows the Theia theme -- survives
// the move: this site keeps rendering the OS-driven variant and never the
// currentColor one.
@injectable()
export class PowerBrowserFaviconContribution implements FrontendApplicationContribution {
    onStart(): void {
        const channel = readBrandingConfig().markSvg;
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = channel !== undefined
            ? `data:image/svg+xml,${encodeURIComponent(channel)}`
            : POWERBROWSER_MARK_DATA_URI;
        document.head.appendChild(link);
    }
}
