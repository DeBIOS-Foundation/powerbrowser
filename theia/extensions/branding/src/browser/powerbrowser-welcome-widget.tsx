import * as React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { ApplicationServer } from '@theia/core/lib/common/application-protocol';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { powerBrowserMarkInline } from './powerbrowser-mark';

// D-33: `@powerbrowser/branding` ships its own welcome widget rather than
// subclassing `@theia/getting-started`'s `GettingStartedWidget` (D-24).
// Registered under the `WidgetFactory` id `welcome` in
// `powerbrowser-frontend-module.ts`, so its `view:` address is `view:welcome`
// verbatim (D-43).
// D-12 fixes the domain `powerbrowser.org` and nothing else. The inherited
// value was a github.com org URL that does not exist -- the DeBIOS Foundation
// has no GitHub org yet -- so this points at the one host the project owns.
export const POWERBROWSER_REPO_URL = 'https://powerbrowser.org/';

@injectable()
export class PowerBrowserWelcomeWidget extends ReactWidget {

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
            console.error('[@powerbrowser/branding] failed to load application info for welcome widget:', error);
        } finally {
            this.update();
        }
    }

    protected openRepo = (e: React.SyntheticEvent): void => {
        e.preventDefault();
        this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true });
    };

    // Per CONTEXT.md's discretion leaning: product name, version, and one
    // repo link only -- no invented marketing copy or tagline.
    protected render(): React.ReactNode {
        return <div className='gs-container'>
            {/* INLINE, not an <img>. The mark inherits the Theia theme's
                foreground through currentColor, and an <img> is a separate
                document that inherits nothing -- which is how the OS-driven
                variant came to render #1a1a1a on the shell's own dark
                background on a light-mode OS and disappear. The markup is a
                compile-time constant derived from POWERBROWSER_MARK_SVG. */}
            {/* eslint-disable-next-line react/no-danger */}
            <span dangerouslySetInnerHTML={{ __html: powerBrowserMarkInline(64) }} />
            {/* The DISPLAY form, with the space. `PowerBrowser` is the
                identifier form (class names, the chrome: package, the API
                object) and inventory/brand-tokens.json records it as the value
                that must never appear in a display string. This heading was
                the identifier form until 01-07 -- exactly what a token-boundary
                rename produces -- and verify-branding.mjs had been renamed to
                expect it, so the two agreed and neither noticed. */}
            <h1>Power Browser</h1>
            {this.version && <p>Version {this.version}</p>}
            <p>
                <a href={POWERBROWSER_REPO_URL} onClick={this.openRepo}>{POWERBROWSER_REPO_URL}</a>
            </p>
        </div>;
    }
}
