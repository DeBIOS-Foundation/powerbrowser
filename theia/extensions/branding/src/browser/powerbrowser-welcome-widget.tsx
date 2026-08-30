import * as React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { SOURCERER_MARK_DATA_URI } from './sourcerer-mark';

// D-33: `@sourcerer/branding` ships its own welcome widget rather than
// subclassing `@theia/getting-started`'s `GettingStartedWidget` (D-24).
// Registered under the `WidgetFactory` id `welcome` in
// `sourcerer-frontend-module.ts`, so its `view:` address is `view:welcome`
// verbatim (D-43).
export const SOURCERER_REPO_URL = 'https://github.com/Deocracy/Sourcerer';

@injectable()
export class SourcererWelcomeWidget extends ReactWidget {

    @inject(ApplicationServer)
    protected readonly appServer: ApplicationServer;

    @inject(WindowService)
    protected readonly windowService: WindowService;

    protected version: string | undefined;

    constructor() {
        super();
        this.id = 'welcome';
        this.title.label = 'Welcome';
        this.title.caption = 'Welcome';
        this.title.closable = true;
    }

    @postConstruct()
    protected init(): void {
        this.doInit();
    }

    protected async doInit(): Promise<void> {
        try {
            const info = await this.appServer.getApplicationInfo();
            this.version = info?.version;
        } catch (error) {
            console.error('[@sourcerer/branding] failed to load application info for welcome widget:', error);
        } finally {
            this.update();
        }
    }

    protected openRepo = (e: React.SyntheticEvent): void => {
        e.preventDefault();
        this.windowService.openNewWindow(SOURCERER_REPO_URL, { external: true });
    };

    // Per CONTEXT.md's discretion leaning: product name, version, and one
    // repo link only -- no invented marketing copy or tagline.
    protected render(): React.ReactNode {
        return <div className='gs-container'>
            <img src={SOURCERER_MARK_DATA_URI} alt='' width={64} height={56} />
            <h1>Sourcerer</h1>
            {this.version && <p>Version {this.version}</p>}
            <p>
                <a href={SOURCERER_REPO_URL} onClick={this.openRepo}>{SOURCERER_REPO_URL}</a>
            </p>
        </div>;
    }
}
