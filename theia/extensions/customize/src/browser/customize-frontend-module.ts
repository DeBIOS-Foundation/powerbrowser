import { ContainerModule } from '@theia/core/shared/inversify';
import { ApplicationShell, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';
import { CustomizeCssContribution } from './customize-css-contribution';
import { PowerBrowserPrivilegedJs } from './powerbrowser-privileged-js';
import { CustomizePrivilegedJsContribution } from './customize-privileged-js-contribution';

export default new ContainerModule(bind => {
    bind(CustomizeCssContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CustomizeCssContribution);

    // D-62: read INSIDE the ContainerModule callback and wrap the
    // privileged bindings in a plain `if` -- the binding is skipped
    // entirely, not registered and then guarded at runtime. A missing or
    // non-`true` value is off (D-62's "missing key behaves as off, never
    // as on"). This is the whole of CUST-02: with the flag off, neither
    // `PowerBrowserPrivilegedJs` nor `CustomizePrivilegedJsContribution` is
    // ever bound, so `isBound(...)` is provably false, not merely unused.
    if (FrontendApplicationConfigProvider.get()['powerbrowserPrivilegedJs'] === true) {
        bind(PowerBrowserPrivilegedJs).toConstantValue(true);
        // `toDynamicValue` rather than `.to(Class)`: the class needs the
        // raw DI container itself (to hand to a user script per D-67),
        // and `ctx.container` inside a dynamic-value factory is the
        // documented way to reach it -- the same idiom
        // `@theia/ai-chat`'s own frontend module uses for its own
        // container-capturing factories.
        bind(CustomizePrivilegedJsContribution).toDynamicValue(ctx => new CustomizePrivilegedJsContribution(
            ctx.container.get(FileService),
            ctx.container.get(ApplicationShell),
            ctx.container,
            // D-67: wired now that @powerbrowser/tab-uris exists (Plan 06) --
            // kept optional (isBound-guarded, not a hard `.get()`) so this
            // module stays loadable in a container composed without
            // @powerbrowser/tab-uris.
            ctx.container.isBound(TabUriRegistry) ? ctx.container.get(TabUriRegistry) : undefined,
        )).inSingletonScope();
        bind(FrontendApplicationContribution).toService(CustomizePrivilegedJsContribution);
    }
});
