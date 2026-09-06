import { inject, injectable } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { WorkspaceServer } from '@theia/workspace/lib/common';
import { ChildProcess, spawn } from 'child_process';
import { createInterface } from 'readline';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { POWERBROWSER_ENV } from '@powerbrowser/token-gate/lib/node/powerbrowser-env';
import {
    OpencodeReply,
    OpencodeService,
    OpenCodePreset,
    StagedFileProposal,
} from '../common/opencode-service';
import { OpencodeChangesetEmitter, StagedEntry } from './opencode-changeset-emitter';

// D-02: HTTP `opencode serve`-attach stays a documented fallback only, not
// the primary path. The primary path is the stdio-supervised `opencode acp`
// child below (D-01): no network surface, no auth handshake, supervised
// death. A serve-attach fallback would rework lifecycle, auth, and session
// mapping together, so it is a deliberate future decision, not a toggle.
//
// Environment hygiene (T-16-01-03, D-07): this file never reads the host
// environment object directly -- every secret comes through POWERBROWSER_ENV,
// captured and scrubbed at module load by powerbrowser-env.ts. The child is
// spawned with an INHERITED environment, which is already scrubbed: the
// capture-and-delete in powerbrowser-env.ts removed every POWERBROWSER_* key
// from this backend process before any contribution initialized, so the
// child cannot inherit the supervised marker (no nested watchdog re-arm)
// and cannot inherit a token (the token travels the stdin pipe only and was
// never in the environment). Nothing secret is added here; the /mcp bridge
// token injection is plan 16-03 scope and will use per-spawn config, never
// a checked-in value.

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
    sessionId?: string;
}

interface TurnAccumulator {
    texts: string[];
    sessionIds: Set<string>;
    permissionAsks: number;
    delegatedWrites: number;
    done: boolean;
}

/** Restart policy: bounded, backoff, never silent. */
const MAX_RESTARTS = 5;
const RESTART_BACKOFF_MS = 1000;

@injectable()
export class OpencodeAcpSupervisor implements BackendApplicationContribution, OpencodeService {
    @inject(WorkspaceServer)
    protected readonly workspaceServer: WorkspaceServer;

    @inject(OpencodeChangesetEmitter)
    protected readonly emitter: OpencodeChangesetEmitter;

    protected child: ChildProcess | undefined;
    protected nextId = 1;
    protected pending = new Map<number, PendingRequest>();
    protected restarts = 0;
    protected shuttingDown = false;
    protected handshakeOk = false;
    protected workspaceRoot: string | undefined;
    protected executable = 'opencode';

    /** 1 Theia chat session -> 1 ACP session, minted at the workspace root. */
    protected acpSessions = new Map<string, string>();
    protected turns = new Map<string, TurnAccumulator>();

    // -- BackendApplicationContribution ------------------------------------

    async initialize(): Promise<void> {
        // Fail-closed startup (token-gate precedent): without the
        // supervision handshake there is no supervised child to own, so exit
        // before listen rather than running half-supervised.
        if (POWERBROWSER_ENV['POWERBROWSER_SUPERVISED'] === '1' && !POWERBROWSER_ENV['POWERBROWSER_TOKEN']) {
            // tslint:disable-next-line:no-console
            console.error('opencode-acp-supervisor: supervised launch without the stdin token -- failing closed');
            process.exit(78);
        }
        this.workspaceRoot = await this.resolveWorkspaceRoot();
        this.spawnChild();
        // The parent watchdog SIGTERMs this backend on parent death; take
        // the supervised child down with it so no orphan survives (DoS).
        process.on('exit', () => this.killChild());
    }

    // -- OpencodeService (JSON-RPC surface at /services/opencode) ----------

    async send(prompt: string, chatSessionId: string): Promise<OpencodeReply> {
        const sessionId = await this.getOrCreateSession(chatSessionId);
        const acc: TurnAccumulator = { texts: [], sessionIds: new Set(), permissionAsks: 0, delegatedWrites: 0, done: false };
        this.turns.set(chatSessionId, acc);
        await this.requestAgent('session/prompt', { sessionId, prompt: [{ type: 'text', text: prompt }] }, sessionId);
        return this.finishTurn(chatSessionId, sessionId);
    }

    async cancel(chatSessionId: string): Promise<void> {
        const sessionId = this.acpSessions.get(chatSessionId);
        if (!sessionId) {
            return;
        }
        // Best-effort: ACP session/cancel is a notification, so a child
        // that never saw the session simply ignores it.
        this.notifyAgent('session/cancel', { sessionId });
        this.turns.delete(chatSessionId);
    }

    async handlePermissionResponse(requestId: string, approved: boolean): Promise<void> {
        const id = Number(requestId);
        const pending = this.pending.get(id);
        if (!pending) {
            return;
        }
        this.pending.delete(id);
        pending.resolve(approved
            ? { outcome: { outcome: 'selected', optionId: 'allow-once' } }
            : { outcome: { outcome: 'cancelled' } });
    }

    async acceptStaged(chatSessionId: string, path: string, preset?: OpenCodePreset): Promise<{ written: boolean; conflict?: string }> {
        return this.emitter.acceptStaged(chatSessionId, path, preset);
    }

    async rejectStaged(chatSessionId: string, path: string): Promise<void> {
        this.emitter.rejectStaged(chatSessionId, path);
    }

    async revertApplied(chatSessionId: string, path: string): Promise<{ reverted: boolean; conflict?: string }> {
        return this.emitter.revertApplied(chatSessionId, path);
    }

    // -- Session mapping ----------------------------------------------------

    /** One stable backend session id per chat; a new chat mints a new one. */
    protected async getOrCreateSession(chatSessionId: string): Promise<string> {
        const existing = this.acpSessions.get(chatSessionId);
        if (existing) {
            return existing;
        }
        // Created at the workspace root and never reloaded elsewhere: the
        // installed binary drops permission replies after a session/load
        // with a different cwd, hanging the turn (research Q1).
        const response = await this.requestAgent('session/new', {
            cwd: this.workspaceRoot ?? '',
            mcpServers: [],
        }) as { sessionId: string };
        this.acpSessions.set(chatSessionId, response.sessionId);
        return response.sessionId;
    }

    protected finishTurn(chatSessionId: string, sessionId: string): OpencodeReply {
        const acc = this.turns.get(chatSessionId);
        const staged: StagedFileProposal[] = this.emitter.stagedFor(chatSessionId).map((e: StagedEntry) => ({
            path: e.path,
            oldText: e.baseText,
            newText: e.proposedText,
            diff: e.diff,
        }));
        const text = acc && acc.texts.length ? acc.texts.join('') : '';
        this.turns.delete(chatSessionId);
        return { text, backendSessionId: sessionId, staged };
    }

    // -- Child lifecycle -----------------------------------------------------

    protected resolveExecutable(): string {
        return this.executable;
    }

    protected async resolveWorkspaceRoot(): Promise<string | undefined> {
        try {
            const mru = await this.workspaceServer.getMostRecentlyUsedWorkspace();
            if (mru) {
                return FileUri.fsPath(mru);
            }
        } catch {
            // Fall through to the process cwd below.
        }
        return undefined;
    }

    /** Spawn the `opencode acp` child over stdio with workspace handoff. */
    protected spawnChild(): void {
        if (this.shuttingDown) {
            return;
        }
        // Spawn args name the acp subcommand with the workspace handoff;
        // protocol version pinned against the SDK wire contract.
        const args = this.workspaceRoot ? ['acp', '--cwd', this.workspaceRoot] : ['acp'];
        const expectedProtocol = PROTOCOL_VERSION;
        if (expectedProtocol !== 1) {
            // tslint:disable-next-line:no-console
            console.error(`opencode-acp-supervisor: unexpected ACP protocol version ${expectedProtocol} -- failing closed`);
            process.exit(78);
        }
        this.child = spawn(this.resolveExecutable(), args, { stdio: ['pipe', 'pipe', 'pipe'] });
        this.handshakeOk = false;
        const reader = createInterface({ input: this.child.stdout! });
        reader.on('line', line => this.onAgentLine(line));
        this.child.stderr!.on('data', (chunk: Buffer) => {
            // tslint:disable-next-line:no-console
            console.error(`[opencode-acp] ${chunk.toString('utf8')}`);
        });
        this.child.on('exit', (code, signal) => this.onChildExit(code, signal));
        this.child.on('error', err => this.onChildError(err));
        // The ACP initialize handshake proves supervision end-to-end before
        // any session exists; without it nothing is served.
        this.requestAgent('initialize', { protocolVersion: PROTOCOL_VERSION }).then(
            () => { this.handshakeOk = true; },
            () => { this.handshakeOk = false; }
        );
    }

    protected onChildExit(code: number | null, signal: string | null): void {
        this.failAllPending(new Error(`opencode acp child exited (code=${code} signal=${signal})`));
        this.child = undefined;
        if (this.shuttingDown) {
            return;
        }
        // Death-with-parent plus restart: a child that dies on its own is
        // respawned with backoff; sessions re-mint on next use because the
        // old backend session ids died with the child.
        this.acpSessions.clear();
        if (this.restarts < MAX_RESTARTS) {
            this.restarts++;
            setTimeout(() => this.spawnChild(), RESTART_BACKOFF_MS * this.restarts);
        } else {
            // tslint:disable-next-line:no-console
            console.error('opencode-acp-supervisor: child restart budget exhausted -- failing closed');
            process.exit(78);
        }
    }

    protected onChildError(err: Error): void {
        // tslint:disable-next-line:no-console
        console.error(`opencode-acp-supervisor: child spawn error: ${err.message}`);
    }

    protected killChild(): void {
        this.shuttingDown = true;
        try {
            this.child?.kill('SIGTERM');
        } catch {
            // Already gone -- nothing to do.
        }
        this.child = undefined;
    }

    protected failAllPending(err: Error): void {
        for (const [, pending] of this.pending) {
            pending.reject(err);
        }
        this.pending.clear();
    }

    // -- ACP wire (NDJSON stdio, per the SDK ndJsonStream framing) -----------

    protected requestAgent(method: string, params: unknown, sessionId?: string): Promise<unknown> {
        const id = this.nextId++;
        return new Promise<unknown>((resolve, reject) => {
            this.pending.set(id, { resolve, reject, sessionId });
            this.writeLine(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
        });
    }

    protected notifyAgent(method: string, params: unknown): void {
        this.writeLine(JSON.stringify({ jsonrpc: '2.0', method, params }));
    }

    protected writeLine(line: string): void {
        try {
            this.child?.stdin!.write(`${line}\n`);
        } catch (err) {
            // tslint:disable-next-line:no-console
            console.error(`opencode-acp-supervisor: stdio write failed: ${(err as Error).message}`);
        }
    }

    protected onAgentLine(line: string): void {
        let msg: { id?: number; method?: string; params?: unknown; result?: unknown; error?: unknown };
        try {
            msg = JSON.parse(line) as { id?: number; method?: string; params?: unknown; result?: unknown; error?: unknown };
        } catch {
            return;
        }
        if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
            const pending = this.pending.get(msg.id);
            if (!pending) {
                return;
            }
            this.pending.delete(msg.id);
            if (msg.error !== undefined) {
                pending.reject(new Error(`opencode acp error: ${JSON.stringify(msg.error)}`));
            } else {
                pending.resolve(msg.result);
            }
            return;
        }
        if (msg.method) {
            this.onAgentRequest(msg.id, msg.method, (msg.params ?? {}) as Record<string, unknown>);
        }
    }

    /** Inbound agent->client traffic: permission asks, delegated writes. */
    protected onAgentRequest(id: number | undefined, method: string, params: Record<string, unknown>): void {
        if (method === 'session/request_permission') {
            this.onRequestPermission(id, params);
            return;
        }
        if (method === 'fs/write_text_file') {
            this.onWriteTextFile(id, params);
            return;
        }
        if (method === 'session/update') {
            this.onSessionUpdate(params);
            return;
        }
        // Unknown inbound method: reply cancelled rather than hanging.
        if (id !== undefined) {
            this.writeLine(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` } }));
        }
    }

    protected onRequestPermission(id: number | undefined, params: Record<string, unknown>): void {
        const toolCall = (params as { toolCall?: Record<string, unknown> }).toolCall ?? {};
        const kind = String(toolCall['kind'] ?? 'unknown');
        const contents = (toolCall['content'] ?? []) as { type?: unknown; path?: unknown; oldText?: unknown; newText?: unknown }[];
        const diff = contents.find(c => c.type === 'diff');
        const sessionId = String((params as { sessionId?: unknown }).sessionId ?? '');
        const chatSessionId = this.chatSessionFor(sessionId);
        // Stage-from-ask (double-write finding): the ask already carries
        // the full diff, so the emitter stages it and the reply rejects --
        // disk stays untouched until the user accepts the Change Set entry.
        const verdict = this.emitter.requestPermission(
            kind,
            diff ? {
                kind,
                path: typeof diff.path === 'string' ? diff.path : undefined,
                oldText: typeof diff.oldText === 'string' ? diff.oldText : undefined,
                newText: typeof diff.newText === 'string' ? diff.newText : undefined,
            } : undefined,
            chatSessionId,
            this.workspaceRoot
        );
        if (id === undefined) {
            return;
        }
        if (verdict === 'allow-once') {
            this.writeLine(JSON.stringify({
                jsonrpc: '2.0', id,
                result: { outcome: { outcome: 'selected', optionId: 'allow-once' } },
            }));
        } else {
            this.writeLine(JSON.stringify({
                jsonrpc: '2.0', id,
                result: { outcome: { outcome: 'cancelled' } },
            }));
        }
    }

    protected onWriteTextFile(id: number | undefined, params: Record<string, unknown>): void {
        const body = params as { sessionId?: unknown; path?: unknown; content?: unknown };
        const sessionId = String(body.sessionId ?? '');
        const chatSessionId = this.chatSessionFor(sessionId) ?? sessionId;
        const acc = this.turns.get(chatSessionId);
        try {
            const entry = this.emitter.writeTextFile(
                chatSessionId,
                this.workspaceRoot ?? '',
                String(body.path ?? ''),
                typeof body.content === 'string' ? body.content : ''
            );
            if (acc) {
                acc.delegatedWrites++;
                if (entry) {
                    acc.sessionIds.add(sessionId);
                }
            }
        } catch (err) {
            if (id !== undefined) {
                this.writeLine(JSON.stringify({
                    jsonrpc: '2.0', id,
                    error: { code: -32000, message: (err as Error).message },
                }));
            }
            return;
        }
        if (id !== undefined) {
            this.writeLine(JSON.stringify({ jsonrpc: '2.0', id, result: null }));
        }
    }

    protected onSessionUpdate(params: Record<string, unknown>): void {
        const sessionId = String((params as { sessionId?: unknown }).sessionId ?? '');
        const chatSessionId = this.chatSessionFor(sessionId);
        if (!chatSessionId) {
            return;
        }
        const acc = this.turns.get(chatSessionId);
        if (!acc || acc.done) {
            return;
        }
        acc.sessionIds.add(sessionId);
        const update = (params as { update?: unknown }).update as { sessionUpdate?: unknown; content?: unknown } | undefined;
        const content = update?.content as { type?: unknown; text?: unknown } | undefined;
        if (update?.sessionUpdate === 'agent_message_chunk' && content?.type === 'text' && typeof content.text === 'string') {
            acc.texts.push(content.text);
        }
    }

    protected chatSessionFor(acpSessionId: string): string | undefined {
        for (const [chat, acp] of this.acpSessions) {
            if (acp === acpSessionId) {
                return chat;
            }
        }
        return undefined;
    }
}
