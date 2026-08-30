import * as fs from 'fs';

// The supervisor's handshake with this backend. Two separate hazards, and
// they need two different mechanisms -- an environment variable closes only
// one of them.
//
// 1. INHERITANCE. Node's process.env is handed to every child the backend
//    ever spawns -- a terminal (@theia/terminal's ShellProcess ->
//    EnvironmentUtils.mergeProcessEnv, which reads process.env LIVE at
//    terminal-creation time), a task, a debug adapter, the plugin host that
//    runs every installed VS Code extension, and the parcel
//    filesystem-watcher fork. SOURCERER_SUPERVISED arms the parent-death
//    watchdog, so inherited it arms one in a NESTED backend started from a
//    Sourcerer terminal (`yarn start`, scripts/smoke-theia.sh,
//    scripts/verify-phase-04.sh), which then self-terminates the instant its
//    own stdin EOFs -- the exact three unsupervised callers
//    parent-watchdog-backend-contribution.ts's gate exists to protect, killed
//    by an unexplained death. SOURCERER_TOKEN_DISABLE, the gate's named dev
//    bypass, has never leaked only because the supervisor sets it to "" and
//    normalizeEnv drops empty values -- which is precisely why this class of
//    bug stayed invisible. Capture-and-delete below closes inheritance for
//    every SOURCERER_*-prefixed key at once.
//
// 2. EXPOSURE. `delete process.env.X` does NOT rewrite /proc/<pid>/environ --
//    glibc's unsetenv edits the pointer array, never the original stack
//    region -- and that file stays readable by any same-uid process for the
//    whole life of the process. Yama's ptrace_scope=1, the common default on
//    this project's own target, blocks /proc/<pid>/mem but NOT environ
//    (procfs environ checks PTRACE_MODE_READ, which Yama's hook does not
//    gate), so the environment is the ONE place a credential stays legible to
//    a co-resident process. SOURCERER_TOKEN is the backend's auth credential
//    for a loopback server with arbitrary file access and terminal spawn, so
//    scrubbing it from process.env would have removed the automatic path and
//    left the exposure: one `tr '\0' '\n' < /proc/<backend>/environ` from any
//    process the user runs still recovers it. So the supervisor does not put
//    the token in the environment at all. It writes it as the first line on
//    the backend's stdin pipe (TheiaService._spawnAndGate ->
//    SourcererAPI.writeStdinLine) and this module reads it back here.
//
// Placement is MODULE LOAD, not a contribution's initialize(), and that is
// load-bearing rather than stylistic for both halves:
//
//   - The scrub must beat @theia/core's EnvVariablesServerImpl, which takes a
//     HARD SNAPSHOT of the whole process.env in its CONSTRUCTOR
//     (core/lib/node/env-variables/env-variables-server.js:36) and serves it
//     to the frontend over JSON-RPC (/services/envs) and to ${env:...}
//     resolution in tasks and launch configs. src-gen/backend/server.js
//     `await load(require(...))`s every container module -- this one included
//     -- and only then calls start(), whose first act is
//     `container.get(CliManager).initializeCli(...)`; nothing before that
//     line resolves a single binding, so no snapshot can predate this file.
//     It must also beat the filesystem-watcher fork
//     (filesystem/lib/node/filesystem-backend-module.js:118, `env:
//     process.env`), which fires during the initialize() phase, and
//     contribution initialize() calls run under Promise.all with no
//     guaranteed ordering.
//   - The token read must complete before SourcererTokenGateContribution's
//     synchronous initialize() decides whether to fail closed, which is
//     itself before the HTTP server ever binds.
//
// Two in-tree precedents for the delete: server.js's own `delete
// process.env.ELECTRON_RUN_AS_NODE`, and @theia/core's createIpcEnv
// (core/lib/node/messaging/ipc-protocol.js), which sweeps every THEIA_* key
// out of a forked child's environment.

const captured: { [key: string]: string | undefined } = {};
for (const key of Object.keys(process.env)) {
    if (key.startsWith('SOURCERER_')) {
        captured[key] = process.env[key];
        delete process.env[key];
    }
}

/**
 * Reads the supervisor's token off fd 0, one byte at a time, stopping AT the
 * first newline. Byte-at-a-time is deliberate: the parent-death watchdog
 * (parent-watchdog-backend-contribution.ts) waits for EOF on this same fd, so
 * nothing may be consumed past the line the supervisor wrote.
 *
 * Blocking is correct here and cannot hang unbounded. The child's fd 0 is the
 * read end of a pipe Subprocess creates in blocking mode -- O_NONBLOCK is set
 * only on the PARENT's end (toolkit/modules/subprocess/subprocess_unix.worker.js's
 * initPipes sets F_SETFL on fds[1] and hands fds[0] to the child) -- and the
 * supervisor writes the line immediately after spawn() resolves, long before
 * this module is reached. If the parent dies first the pipe EOFs and this
 * returns undefined, which fails the gate closed.
 */
function readTokenFromStdin(): string | undefined {
    const byte = Buffer.alloc(1);
    const bytes: number[] = [];
    while (bytes.length <= 512) {
        let count: number;
        try {
            count = fs.readSync(0, byte, 0, 1, null);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'EAGAIN') {
                // Only reachable if something turned fd 0 non-blocking before
                // this module loaded. Retry rather than fail: the supervisor's
                // own startup timeout bounds the wait either way.
                continue;
            }
            return undefined;
        }
        if (count === 0) {
            return undefined;
        }
        if (byte[0] === 0x0a) {
            return Buffer.from(bytes).toString('utf8');
        }
        bytes.push(byte[0]);
    }
    return undefined;
}

if (captured.SOURCERER_SUPERVISED === '1') {
    // Supervised: the stdin line is the ONLY accepted source. Any inherited
    // SOURCERER_TOKEN was captured and deleted above and is deliberately
    // overwritten here -- the supervisor never sets one, so a value present in
    // the launching shell's environment is not this backend's credential and
    // must not be treated as one. Undefined (parent died, or wrote nothing)
    // leaves the gate to fail closed.
    captured.SOURCERER_TOKEN = readTokenFromStdin();
}

/**
 * The supervisor's handshake as it was actually delivered: the SOURCERER_*
 * variables captured before they were scrubbed from `process.env`, with
 * SOURCERER_TOKEN replaced by the stdin-delivered value on a supervised
 * launch. Every reader in this extension must use this instead of
 * `process.env` -- reading `process.env` directly would find nothing, and
 * re-introducing any of these variables would re-open the leak.
 */
export const SOURCERER_ENV: Readonly<{ [key: string]: string | undefined }> = captured;
