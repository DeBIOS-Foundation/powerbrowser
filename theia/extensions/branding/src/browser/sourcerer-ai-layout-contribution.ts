// These two rebinds live in @sourcerer/branding, not @sourcerer/customize or
// @sourcerer/tab-uris, because both are first-boot *presentation* decisions --
// what the app looks like out of the box -- not tab-model or customization
// concerns. See 02-CONTEXT.md D-22. A later reader should not move them into
// @sourcerer/tab-uris just because both classes originate in @theia/ai-ide.

import { injectable } from '@theia/core/shared/inversify';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import { FrontendApplication } from '@theia/core/lib/browser';
import { AIFirstPerspectiveContribution } from '@theia/ai-ide/lib/browser/ai-first-perspective-contribution';
import { AIAgentConfigurationViewContribution } from '@theia/ai-ide/lib/browser/ai-configuration/ai-configuration-view-contribution';

/**
 * D-22 rebind 1: a no-op subclass of `AIFirstPerspectiveContribution`.
 * `@theia/ai-ide` v1.74 ships an "AI First" perspective option; Sourcerer's
 * out-of-box layout is the stock shell plus the welcome tab (Plan 03), never
 * a switchable AI-first arrangement. Overriding `registerPerspectives` to a
 * no-op means the perspective is never registered with `PerspectiveService`,
 * so it cannot be selected or applied by any route.
 */
@injectable()
export class SourcererAIFirstPerspectiveContribution extends AIFirstPerspectiveContribution {
    override registerPerspectives(_service: PerspectiveService): void {
        // Intentionally empty -- see file header.
    }
}

/**
 * D-22 rebind 2: `AIAgentConfigurationViewContribution.initializeLayout()`
 * forces the AI configuration widget open as a main-area tab the first time
 * `FrontendApplication.createDefaultLayout()` runs (fresh profile, no
 * persisted layout). Overriding it to a no-op stops that forced open while
 * leaving `openView()` and the `aiConfiguration:open` command intact -- the
 * view is still reachable on demand, and Plan 06 gives it the address
 * `view:ai-configuration`.
 */
@injectable()
export class SourcererAIConfigurationViewContribution extends AIAgentConfigurationViewContribution {
    override async initializeLayout(_app: FrontendApplication): Promise<void> {
        // Intentionally empty -- see file header. openView()/registerCommands
        // are untouched, so the view still opens on demand.
    }
}
