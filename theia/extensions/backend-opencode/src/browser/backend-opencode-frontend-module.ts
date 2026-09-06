import { ContainerModule } from '@theia/core/shared/inversify';
import { ChatAgent } from '@theia/ai-chat/lib/common';
import { CommandContribution } from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { OPENCODE_SERVICE_PATH, OpencodeService } from '../common/opencode-service';
import { OpencodeChatAgent } from './opencode-chat-agent';
import { OpencodePresetStore } from './opencode-preset-commands';
import { OpencodePresetContribution } from './opencode-preset-contribution';

// 16-01 Task 2: frontend composition. The ChatAgent token binds to the new
// agent class and the backend proxy rides the existing authenticated
// websocket at OPENCODE_SERVICE_PATH -- no new transport, no HTTP route.
// Static at module load beside no other binds (D-50).
// 16-02 Task 1: the preset store plus its command and chat-header toolbar
// contributions bind statically beside the Task-01 binds above.
// 16-03 Task 2: selection wiring. The whole @OpenCode registration reads
// INSIDE the ContainerModule callback and wraps every bind in a plain
// `if` -- the D-62 powerbrowserPrivilegedJs precedent: the binding is
// skipped entirely when off, not registered and then guarded at runtime.
// A missing or non-`opencode` value is off (missing key behaves as off,
// never as on). With the backend off, no @OpenCode picker entry and no
// preset UI ever bind, so `isBound(...)` is provably false.
export default new ContainerModule(bind => {
    if (FrontendApplicationConfigProvider.get()['powerbrowserAiBackend'] === 'opencode') {
        bind(OpencodeService).toDynamicValue(ctx =>
            WebSocketConnectionProvider.createProxy<OpencodeService>(ctx.container, OPENCODE_SERVICE_PATH)
        ).inSingletonScope();
        bind(OpencodeChatAgent).toSelf().inSingletonScope();
        bind(ChatAgent).toService(OpencodeChatAgent);
        bind(OpencodePresetStore).toSelf().inSingletonScope();
        bind(OpencodePresetContribution).toSelf().inSingletonScope();
        bind(CommandContribution).toService(OpencodePresetContribution);
        bind(TabBarToolbarContribution).toService(OpencodePresetContribution);
    }
});
