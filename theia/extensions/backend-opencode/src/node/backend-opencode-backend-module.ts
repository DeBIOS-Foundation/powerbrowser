import { ContainerModule } from '@theia/core/shared/inversify';

// 16-01 Task 1: bind-free compilation stub. The ContainerModule call is
// present so composition resolves; every bind (ACP supervisor as
// BackendApplicationContribution, JSON-RPC connection handler) lands in
// Task 2 alongside the implementation files. This module deliberately
// imports nothing created later.
export default new ContainerModule(() => {
    // No binds yet -- added in Task 2 with opencode-acp-supervisor.ts.
});
