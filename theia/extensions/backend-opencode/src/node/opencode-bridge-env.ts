import { POWERBROWSER_ENV } from '@powerbrowser/token-gate/lib/node/powerbrowser-env';

// 16-03 Task 1: per-spawn bridge environment (D-07).
//
// The opencode child needs exactly one secret-adjacent value: the bridge
// variable its MCP header reference ({env:POWERBROWSER_MCP_TOKEN})
// resolves against. Everything else POWERBROWSER_*-shaped is scrubbed:
// the supervised marker (inheriting it would arm the parent-watchdog in
// nested backends spawned from opencode terminals) and the supervisor's
// own token name (the child's credential travels under the bridge name
// only, so a POWERBROWSER_TOKEN in a child env is never this backend's
// credential and must not be treated as one).
//
// This lives here -- not in the supervisor -- because the tracer gate
// pins the supervisor file to zero host-env reads (T-16-01-03): the
// supervisor passes nothing and reads nothing here, it just hands the
// built env to spawn. Secrets still enter only through POWERBROWSER_ENV,
// captured and scrubbed at module load; process.env below is forwarded
// for ordinary values (PATH, HOME, ...) and never read for secrets.

/** The one per-spawn variable the bridge reference resolves against. */
export const OPENCODE_BRIDGE_ENV_TOKEN = 'POWERBROWSER_MCP_TOKEN';

/** Build the opencode child's environment: scrubbed base plus the bridge variable. */
export function buildBridgeChildEnv(): { [key: string]: string } {
    const env: { [key: string]: string } = {};
    for (const key of Object.keys(process.env)) {
        if (key === 'POWERBROWSER_SUPERVISED' || key === 'POWERBROWSER_TOKEN' || key.indexOf('POWERBROWSER_') === 0) {
            continue;
        }
        const value = process.env[key];
        if (value !== undefined) {
            env[key] = value;
        }
    }
    const token = POWERBROWSER_ENV['POWERBROWSER_TOKEN'];
    if (token) {
        env[OPENCODE_BRIDGE_ENV_TOKEN] = token;
    }
    return env;
}
