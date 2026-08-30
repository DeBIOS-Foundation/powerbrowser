import * as React from '@theia/core/shared/react';
import { injectable, inject } from '@theia/core/shared/inversify';
import { AboutDialog, AboutDialogProps, ABOUT_CONTENT_CLASS } from '@theia/core/lib/browser/about-dialog';
import { POWERBROWSER_MARK_DATA_URI } from './powerbrowser-mark';
import { POWERBROWSER_REPO_URL } from './powerbrowser-welcome-widget';

// D-35: `render()` is overridden entirely -- not just the title -- because
// the base `AboutDialog`'s two identity-leaking renderers are unavoidable
// otherwise: `renderHeader()` hard-links
// eclipse-theia.github.io/vscode-theia-comparator, and `renderExtensions()`
// lists every `@theia/*` package by name and version. Both are dropped, not
// restyled. `applicationInfo` is populated by the inherited `doInit()`
// (already called by the base class's `@postConstruct` init) -- not
// re-implemented here.
@injectable()
export class PowerBrowserAboutDialog extends AboutDialog {

    constructor(@inject(AboutDialogProps) protected override readonly props: AboutDialogProps) {
        super(props);
    }

    protected override render(): React.ReactNode {
        return <div className={ABOUT_CONTENT_CLASS}>
            {this.renderContent()}
        </div>;
    }

    // PowerBrowser's own body -- mark, name, version, one repo link. No
    // renderExtensions() call, no eclipse-theia.github.io link (D-35,
    // criterion 1).
    protected renderContent(): React.ReactNode {
        return <div className='ad-container'>
            <img src={POWERBROWSER_MARK_DATA_URI} alt='' width={48} height={42} />
            <h3>PowerBrowser</h3>
            {this.applicationInfo && <p>Version {this.applicationInfo.version}</p>}
            <p>
                <a
                    role='button'
                    tabIndex={0}
                    onClick={() => this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true })}>
                    {POWERBROWSER_REPO_URL}
                </a>
            </p>
        </div>;
    }
}
