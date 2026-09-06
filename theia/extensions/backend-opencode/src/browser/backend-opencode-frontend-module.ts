import { ContainerModule } from '@theia/core/shared/inversify';
import { ChatAgent } from '@theia/ai-chat/lib/common';
import { CommandContribution } from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';
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
export default new ContainerModule(bind => {
    bind(OpencodeService).toDynamicValue(ctx =>
        WebSocketConnectionProvider.createProxy<OpencodeService>(ctx.container, OPENCODE_SERVICE_PATH)
    ).inSingletonScope();
    bind(OpencodeChatAgent).toSelf().inSingletonScope();
    bind(ChatAgent).toService(OpencodeChatAgent);
    bind(OpencodePresetStore).toSelf().inSingletonScope();
    bind(OpencodePresetContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(OpencodePresetContribution);
    bind(TabBarToolbarContribution).toService(OpencodePresetContribution);
});
