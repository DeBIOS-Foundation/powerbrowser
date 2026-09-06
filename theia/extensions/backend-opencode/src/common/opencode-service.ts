/**
 * 16-01 Task 2: the shared contract between the @OpenCode frontend agent
 * and the backend ACP supervisor (mirrors upstream ai-claude-code's
 * common/claude-code-service.ts split: send/cancel/permission-response
 * over one JSON-RPC path, staging calls added for the D-03
 * intercept-then-record path).
 *
 * Pure TypeScript: no Theia imports, so both the frontend and the backend
 * modules can depend on it without pulling a side.
 */

/** JSON-RPC path the backend connection handler serves (key link: the
 *  frontend agent reaches the supervisor only through this path). */
export const OPENCODE_SERVICE_PATH = '/services/opencode';

export const OpencodeService = Symbol('OpencodeService');

/** One backend-proposed file write, staged -- never yet on disk. */
export interface StagedFileProposal {
    /** Workspace-relative display path plus absolute path. */
    path: string;
    /** Live file bytes at stage time ('' when the file did not exist). */
    oldText: string;
    /** Exact backend-proposed bytes. */
    newText: string;
    /** Human-readable unified-style diff for the review surface. */
    diff: string;
}

/** What one chat turn returns once the ACP turn completes. */
export interface OpencodeReply {
    /** Assistant text for the chat transcript. */
    text: string;
    /** Stable ACP backend session id that served this turn. */
    backendSessionId: string;
    /** Staged proposals from this turn; empty for zero-edit answers. */
    staged: StagedFileProposal[];
}

export interface OpencodeService {
    /** Send one prompt on the caller's chat session; resolves at turn end. */
    send(prompt: string, chatSessionId: string): Promise<OpencodeReply>;
    /** Best-effort cancel of the in-flight turn for a chat session. */
    cancel(chatSessionId: string): Promise<void>;
    /**
     * Mirror of the Claude adapter's handleApprovalResponse: records the
     * user's verdict on a pending permission ask. The tracer auto-answers
     * safe asks (see the supervisor); this stays for the gated UI later.
     */
    handlePermissionResponse(requestId: string, approved: boolean): Promise<void>;
    /** Accept one staged file: stale-check then write exact bytes. */
    acceptStaged(chatSessionId: string, path: string): Promise<{ written: boolean; conflict?: string }>;
    /** Reject one staged file: drop it, disk untouched. */
    rejectStaged(chatSessionId: string, path: string): Promise<void>;
}

/** Backend-to-frontend pushes (turn tokens stream here in later plans;
 * the tracer resolves whole turns through send()). */
export interface OpencodeClient {
    sendToken(chatSessionId: string, token: string): void;
    sendError(chatSessionId: string, message: string): void;
}
