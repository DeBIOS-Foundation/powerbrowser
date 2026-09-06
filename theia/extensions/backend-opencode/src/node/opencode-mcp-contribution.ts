import { inject, injectable } from '@theia/core/shared/inversify';
import * as express from '@theia/core/shared/express';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { WorkspaceServer } from '@theia/workspace/lib/common';
import { promises as fsp } from 'fs';
import { resolve, sep } from 'path';
import { POWERBROWSER_ENV } from '@powerbrowser/token-gate/lib/node/powerbrowser-env';

// 16-03 Task 1: minimal read-only /mcp endpoint (slice 0, SPEC R5).
//
// Serves workspace-context reads ONLY -- a workspace listing plus a file
// read, no writes, no diagnostics beyond what the read needs. Registered
// in configure(), which BackendApplication runs after applying the token
// gate's early middleware, so every request here has already passed (or
// been refused by) gate() -- the endpoint rides the existing gated
// channel with no new auth surface: unauthenticated GET plus POST never
// reach this file (403, no cookie set), per-spawn token holders presenting
// the token cookie read live state.
//
// The wire shape is MCP JSON-RPC over HTTP POST (single JSON responses,
// which StreamableHTTP allows when nothing streams) plus a GET descriptor
// carrying the live workspace root. opencode consumes it as one configured
// remote server (see opencode.mcp.json): its client resolves the
// {env:POWERBROWSER_MCP_TOKEN} header reference per spawn and sends it as
// a Cookie header, which the gate validates like any browser cookie.
//
// Hygiene: this file reads no host environment object -- the handshake
// check uses the captured POWERBROWSER_ENV module and the workspace root
// comes from the injected WorkspaceServer (backend cwd fallback when no
// workspace is open). Reads are stateless point-in-time filesystem reads
// with no snapshot promise (R5 backstop).

/** The contributed route, shared with the supervisor's bridge entry. */
export const OPENCODE_MCP_ROUTE = '/mcp';

/** The whole read-only tool surface. Additions widen the bridge. */
export const OPENCODE_MCP_TOOL_LIST = 'workspace_list';
export const OPENCODE_MCP_TOOL_READ = 'workspace_read';

/** Per-spawn bridge variables (D-07). Values are injected per spawn. */
export const OPENCODE_BRIDGE_ENV_TOKEN = 'POWERBROWSER_MCP_TOKEN';
export const OPENCODE_BRIDGE_ENV_PORT = 'POWERBROWSER_MCP_PORT';

const MCP_VERSION = '2025-06-18';
const SERVER_NAME = 'powerbrowser';
const SERVER_VERSION = '0.1.0';
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_LIST_ENTRIES = 500;

/**
 * The per-session server entry the supervisor hands opencode in ACP
 * session/new (verified against opencode 1.18.25: type "http" with a
 * headers ARRAY of {name, value}; "remote"-with-record is the config-FILE
 * shape and is rejected here). The port is filled live -- it is known
 * only after the backend binds -- while the secret stays the
 * interpolation reference resolving against the per-spawn child env.
 */
export function buildBridgeServerEntry(url: string): {
    type: string; name: string; url: string; headers: { name: string; value: string }[];
} {
    return {
        type: 'http',
        name: 'powerbrowser',
        url,
        headers: [{ name: 'Cookie', value: 'POWERBROWSER_TOKEN={env:' + OPENCODE_BRIDGE_ENV_TOKEN + '}' }],
    };
}

interface ToolDef {
    name: string;
    description: string;
    inputSchema: { type: string; properties: Record<string, { type: string; description: string }>; required: string[] };
}

const TOOL_DEFS: ToolDef[] = [
    {
        name: OPENCODE_MCP_TOOL_LIST,
        description: 'List the names in a workspace directory (files and folders, sorted).',
        inputSchema: {
            type: 'object',
            properties: { path: { type: 'string', description: 'Workspace-relative directory, empty for the root.' } },
            required: [],
        },
    },
    {
        name: OPENCODE_MCP_TOOL_READ,
        description: 'Read a workspace file as text.',
        inputSchema: {
            type: 'object',
            properties: { path: { type: 'string', description: 'Workspace-relative file path.' } },
            required: ['path'],
        },
    },
];

@injectable()
export class OpencodeMcpContribution implements BackendApplicationContribution {
    @inject(WorkspaceServer)
    protected readonly workspaceServer: WorkspaceServer;

    async initialize(): Promise<void> {
        // Fail-closed startup (token-gate precedent): without the
        // supervision handshake there is no token for the gate to check
        // reads against, so exit before listen rather than serving reads
        // no holder could ever be refused... or admitted.
        if (POWERBROWSER_ENV['POWERBROWSER_SUPERVISED'] === '1' && !POWERBROWSER_ENV['POWERBROWSER_TOKEN']) {
            // tslint:disable-next-line:no-console
            console.error('opencode-mcp-contribution: supervised launch without the stdin token -- failing closed');
            process.exit(78);
        }
    }

    configure(app: express.Application): void {
        // Gated for free (see file header): configure() runs after the
        // early middleware, so gate() has already admitted token holders
        // and refused everyone else before either handler runs.
        app.get(OPENCODE_MCP_ROUTE, (req, res) => {
            void this.onGet(req, res);
        });
        app.post(OPENCODE_MCP_ROUTE, (req, res) => {
            void this.onPost(req, res);
        });
    }

    /** GET: endpoint descriptor with the LIVE workspace root. */
    protected async onGet(_req: express.Request, res: express.Response): Promise<void> {
        const root = await this.resolveRoot();
        res.json({
            name: SERVER_NAME,
            version: SERVER_VERSION,
            protocol: 'mcp',
            route: OPENCODE_MCP_ROUTE,
            capabilities: { tools: {} },
            tools: [OPENCODE_MCP_TOOL_LIST, OPENCODE_MCP_TOOL_READ],
            workspaceRoot: root,
        });
    }

    /** POST: MCP JSON-RPC dispatch, read-only methods only. */
    protected async onPost(req: express.Request, res: express.Response): Promise<void> {
        let raw: string;
        try {
            raw = await this.readBody(req);
        } catch {
            res.status(413).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'request body too large' } });
            return;
        }
        let msg: { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
        try {
            msg = JSON.parse(raw) as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
        } catch {
            res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'invalid JSON' } });
            return;
        }
        if (typeof msg.method !== 'string') {
            res.status(400).json({ jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32600, message: 'invalid request' } });
            return;
        }
        const id = (msg.id === undefined || msg.id === null) ? undefined : msg.id;
        const params = (msg.params ?? {}) as Record<string, unknown>;
        try {
            const result = await this.dispatch(msg.method, params);
            if (id === undefined) {
                // Notification (e.g. notifications/initialized): no body.
                res.status(202).end();
                return;
            }
            res.json({ jsonrpc: '2.0', id, result });
        } catch (err) {
            const failure = err as { code?: unknown; message?: unknown };
            const body = { jsonrpc: '2.0', id: id ?? null, error: { code: typeof failure.code === 'number' ? failure.code : -32000, message: typeof failure.message === 'string' ? failure.message : 'request failed' } };
            res.status(typeof failure.code === 'number' && failure.code <= -32700 ? 400 : 200).json(body);
        }
    }

    protected async dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
        if (method === 'initialize') {
            const inner = (params as { protocolVersion?: unknown }).protocolVersion;
            return {
                protocolVersion: typeof inner === 'string' && inner ? inner : MCP_VERSION,
                capabilities: { tools: {} },
                serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
            };
        }
        if (method === 'notifications/initialized') {
            return null;
        }
        if (method === 'tools/list') {
            return { tools: TOOL_DEFS };
        }
        if (method === 'tools/call') {
            return this.callTool(params);
        }
        const err = new Error('unknown method ' + method) as Error & { code: number };
        err.code = -32601;
        throw err;
    }

    protected async callTool(params: Record<string, unknown>): Promise<unknown> {
        const name = (params as { name?: unknown }).name;
        const args = ((params as { arguments?: unknown }).arguments ?? {}) as Record<string, unknown>;
        const root = await this.resolveRoot();
        if (name === OPENCODE_MCP_TOOL_LIST) {
            const entries = await this.listDir(root, typeof args['path'] === 'string' ? args['path'] : '');
            return { content: [{ type: 'text', text: JSON.stringify(entries) }] };
        }
        if (name === OPENCODE_MCP_TOOL_READ) {
            if (typeof args['path'] !== 'string' || !args['path']) {
                throw this.fail(-32602, 'workspace_read needs a path');
            }
            const text = await this.readFile(root, args['path']);
            return { content: [{ type: 'text', text }] };
        }
        throw this.fail(-32602, 'unknown tool ' + String(name));
    }

    /** Open workspace when one is open, else the backend cwd (live either way). */
    protected async resolveRoot(): Promise<string> {
        try {
            const mru = await this.workspaceServer.getMostRecentlyUsedWorkspace();
            if (mru) {
                return FileUri.fsPath(mru);
            }
        } catch {
            // Fall through to the backend cwd below.
        }
        return resolve('.');
    }

    /** Clamp a workspace-relative path inside the root; absolute or escaping inputs refuse. */
    protected clamp(root: string, userPath: string): string {
        const abs = resolve(root, userPath);
        if (abs !== root && !abs.startsWith(root + sep)) {
            throw this.fail(-32000, 'path escapes the workspace root');
        }
        return abs;
    }

    protected async listDir(root: string, userPath: string): Promise<{ name: string; type: string }[]> {
        const abs = this.clamp(root, userPath);
        let stat: { isDirectory(): boolean };
        try {
            stat = await fsp.stat(abs);
        } catch {
            throw this.fail(-32000, 'not found: ' + userPath);
        }
        if (!stat.isDirectory()) {
            throw this.fail(-32000, 'not a directory: ' + userPath);
        }
        const names = await fsp.readdir(abs);
        const out: { name: string; type: string }[] = [];
        for (const name of names.sort().slice(0, MAX_LIST_ENTRIES)) {
            try {
                const child = await fsp.stat(resolve(abs, name));
                out.push({ name, type: child.isDirectory() ? 'directory' : 'file' });
            } catch {
                // Vanished mid-listing: point-in-time reads skip it.
            }
        }
        return out;
    }

    protected async readFile(root: string, userPath: string): Promise<string> {
        const abs = this.clamp(root, userPath);
        let stat: { isFile(): boolean; size: number };
        try {
            stat = await fsp.stat(abs);
        } catch {
            throw this.fail(-32000, 'not found: ' + userPath);
        }
        if (!stat.isFile()) {
            throw this.fail(-32000, 'not a file: ' + userPath);
        }
        if (stat.size > MAX_FILE_BYTES) {
            throw this.fail(-32000, 'file too large: ' + userPath);
        }
        try {
            return await fsp.readFile(abs, 'utf8');
        } catch {
            throw this.fail(-32000, 'unreadable file: ' + userPath);
        }
    }

    protected readBody(req: express.Request): Promise<string> {
        const known = (req as unknown as { body?: unknown }).body;
        if (typeof known === 'string') {
            return Promise.resolve(known);
        }
        if (known !== undefined && known !== null && typeof known === 'object') {
            return Promise.resolve(JSON.stringify(known));
        }
        return new Promise<string>((resolving, rejecting) => {
            const chunks: Buffer[] = [];
            let size = 0;
            let settled = false;
            req.on('data', (chunk: Buffer) => {
                if (settled) {
                    return;
                }
                size += chunk.length;
                if (size > MAX_BODY_BYTES) {
                    settled = true;
                    rejecting(new Error('body too large'));
                    return;
                }
                chunks.push(chunk);
            });
            req.on('end', () => {
                if (!settled) {
                    settled = true;
                    resolving(Buffer.concat(chunks).toString('utf8'));
                }
            });
            req.on('error', err => {
                if (!settled) {
                    settled = true;
                    rejecting(err);
                }
            });
        });
    }

    protected fail(code: number, message: string): Error & { code: number } {
        const err = new Error(message) as Error & { code: number };
        err.code = code;
        return err;
    }
}
