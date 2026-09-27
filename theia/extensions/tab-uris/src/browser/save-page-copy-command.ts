/**
 * NG-028 (non-GUI wave B): Save Page Copy. Stores a full copy of a tab's page
 * (the document and the files it loaded) in the profile, recorded in the
 * saved_pages table. From the command palette it saves the current in-shell
 * web tab; a caller may pass any tab's row key (tabs.uri) instead.
 */
import { inject, injectable } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core/lib/common';
import { ApplicationShell } from '@theia/core/lib/browser';
import { ChromeStoreClient, SavedPageCopy } from './chrome-store-client';
import { WebTabWidget } from './web-tab';

export const SAVE_PAGE_COPY_COMMAND: Command = { id: 'powerbrowser.tab.savePageCopy', label: 'Save Page Copy' };

@injectable()
export class SavePageCopyCommandContribution implements CommandContribution {
    @inject(ChromeStoreClient)
    protected readonly store: ChromeStoreClient;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(MessageService)
    protected readonly messages: MessageService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(SAVE_PAGE_COPY_COMMAND, { execute: (uri?: unknown) => this.save(uri) });
    }

    protected async save(uri?: unknown): Promise<SavedPageCopy | undefined> {
        const target = typeof uri === 'string' && uri ? uri : this.currentTabUri();
        if (!target) {
            void this.messages.warn('Power Browser can only save a web page. Select a web tab, then run Save Page Copy again.');
            return undefined;
        }
        try {
            return await this.store.savePageCopy(target);
        } catch {
            void this.messages.error("Power Browser couldn't save a copy of this page. Reload the page, then run Save Page Copy again.");
            return undefined;
        }
    }

    /** The current in-shell web tab's row key (docs/TAB-STORE.md, "Row keys"); other tabs hold no page. */
    protected currentTabUri(): string | undefined {
        const widget = this.shell.currentWidget;
        return widget instanceof WebTabWidget && widget.rowKey ? widget.rowKey : undefined;
    }
}
