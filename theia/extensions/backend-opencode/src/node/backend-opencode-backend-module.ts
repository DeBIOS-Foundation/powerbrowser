import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { OPENCODE_SERVICE_PATH, OpencodeService } from '../common/opencode-service';
import { OpencodeAcpSupervisor } from './opencode-acp-supervisor';
import { OpencodeChangesetEmitter } from './opencode-changeset-emitter';
import { OpencodeMcpContribution } from './opencode-mcp-contribution';

// 16-01 Task 2: backend composition. The supervisor serves both as the
// BackendApplicationContribution (child lifecycle) and as the
// OpencodeService JSON-RPC implementation at OPENCODE_SERVICE_PATH over
// the existing authenticated websocket -- no new transport, no HTTP
// route, no token-gate re-review. Static at load beside no other binds.
// 16-03 Task 1: the read-only /mcp contribution binds statically beside
// the supervisor. Its routes register in configure(), after the token
// gate's early middleware, so the gate covers them for free.
export default new ContainerModule(bind => {
    bind(OpencodeChangesetEmitter).toSelf().inSingletonScope();
    bind(OpencodeAcpSupervisor).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(OpencodeAcpSupervisor);
    bind(OpencodeMcpContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(OpencodeMcpContribution);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<OpencodeService>(OPENCODE_SERVICE_PATH, () =>
            ctx.container.get(OpencodeAcpSupervisor)
        )
    );
});
