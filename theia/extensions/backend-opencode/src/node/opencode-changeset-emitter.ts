import { injectable } from '@theia/core/shared/inversify';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 16-01 Task 2: intercept-then-record staging (D-03, first option).
 *
 * The ACP supervisor routes every `session/request_permission` ask and
 * every delegated `fs/write_text_file` call here BEFORE anything reaches
 * disk. Proposals land as staged Change Set entries grouped per file;
 * accept writes the exact backend bytes, reject drops the entry leaving
 * the file byte-identical, zero-edit answers create no entry.
 *
 * Threat mitigations owned here:
 * - T-16-01-01: every staged path is clamped to the workspace root and
 *   refused otherwise (fail-closed negative test in the tracer gate).
 * - T-16-01-02: token-shaped strings are redacted out of diffs and staged
 *   presentation; secrets travel the stdin-pipe path only.
 * - D-04: the stale-hunk check lives at accept time on the Theia side:
 *   the live file is compared against the staged base and a mismatch
 *   refuses with a conflict while preserving the proposal.
 */

export type StagedStatus = 'staged' | 'accepted' | 'rejected' | 'conflict';

export interface StagedEntry {
    chatSessionId: string;
    /** Absolute workspace path. */
    path: string;
    /** Live bytes at stage time ('' when absent). */
    baseText: string;
    /** Exact backend-proposed bytes (memory-only until accept). */
    proposedText: string;
    /** Redacted presentation diff. */
    diff: string;
    status: StagedStatus;
    conflict?: string;
}

/**
 * Clamp a backend-proposed path to the workspace root. Returns the
 * absolute path, or throws -- fail-closed (T-16-01-01). Pure and
 * exported so the tracer gate tests shipped behavior, not a copy.
 */
export function clampStagedPath(workspaceRoot: string, candidate: string): string {
    const root = path.resolve(workspaceRoot);
    const resolved = path.resolve(root, candidate);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error(`refusing to stage outside the workspace root: ${candidate}`);
    }
    return resolved;
}

const SECRET_PATTERNS: RegExp[] = [
    /sk-[A-Za-z0-9\-_]{8,}/g,
    /ghp_[A-Za-z0-9]{8,}/g,
    /gho_[A-Za-z0-9]{8,}/g,
    /xox[bap]-[A-Za-z0-9\-]{8,}/g,
    /opencode_[A-Za-z0-9\-_]{8,}/g,
    /Bearer\s+[A-Za-z0-9\-._~+/=]{8,}/g,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const REDACTED = '[redacted]';

/**
 * Redact token-shaped strings from presentation text (diffs, history
 * fixtures). Pure and exported so the tracer gate tests shipped
 * behavior (T-16-01-02). Never applied to the accepted bytes -- accept
 * writes the exact backend proposal.
 */
export function redactSecretStrings(text: string): { text: string; redacted: number } {
    let redacted = 0;
    let out = text;
    for (const pattern of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        out = out.replace(pattern, match => {
            redacted++;
            // Keep PEM framing so the shape of the redaction stays visible.
            return match.startsWith('-----BEGIN') ? `-----BEGIN PRIVATE KEY-----${REDACTED}-----END PRIVATE KEY-----` : REDACTED;
        });
    }
    return { text: out, redacted };
}

/** Minimal unified-style diff for one-file review presentation. */
export function renderUnifiedDiff(fsPath: string, oldText: string, newText: string): string {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const out = [`--- a/${fsPath}`, `+++ b/${fsPath}`];
    const max = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < max; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];
        if (oldLine === newLine) {
            out.push(` ${oldLine ?? ''}`);
        } else {
            if (oldLine !== undefined) {
                out.push(`-${oldLine}`);
            }
            if (newLine !== undefined) {
                out.push(`+${newLine}`);
            }
        }
    }
    return out.join('\n');
}

function readLiveBytes(absolutePath: string): string | undefined {
    try {
        return fs.readFileSync(absolutePath, 'utf8');
    } catch {
        return undefined;
    }
}

@injectable()
export class OpencodeChangesetEmitter {
    protected staged = new Map<string, StagedEntry>();
    /** Every permission ask, allowed or denied -- the audit trail. */
    protected permissionLog: { tool: string; verdict: 'allow-once' | 'reject' }[] = [];

    protected key(chatSessionId: string, absolutePath: string): string {
        return `${chatSessionId}::${absolutePath}`;
    }

    /**
     * ACP `session/request_permission` handler. Gated default per D-05:
     * read-shaped tools are allowed once (their writes still intercept
     * below, so approval can never touch disk directly), everything that
     * executes (bash/terminal) is rejected fail-closed. Every verdict is
     * logged either way.
     */
    requestPermission(tool: string): 'allow-once' | 'reject' {
        const readShaped = /^(read|edit|write|glob|grep|ls|patch)$/i.test(tool);
        const verdict = readShaped ? 'allow-once' : 'reject';
        this.permissionLog.push({ tool, verdict });
        return verdict;
    }

    getPermissionLog(): ReadonlyArray<{ tool: string; verdict: 'allow-once' | 'reject' }> {
        return this.permissionLog;
    }

    /**
     * ACP `fs/write_text_file` handler: the delegated write. Stages the
     * proposal as a Change Set entry; never writes disk here. Zero-edit
     * proposals (content already equals live bytes) create no entry.
     */
    writeTextFile(chatSessionId: string, workspaceRoot: string, candidatePath: string, content: string): StagedEntry | undefined {
        const absolutePath = clampStagedPath(workspaceRoot, candidatePath);
        const live = readLiveBytes(absolutePath) ?? '';
        if (live === content) {
            return undefined;
        }
        const rawDiff = renderUnifiedDiff(absolutePath, live, content);
        const entry: StagedEntry = {
            chatSessionId,
            path: absolutePath,
            baseText: live,
            proposedText: content,
            diff: redactSecretStrings(rawDiff).text,
            status: 'staged',
        };
        this.staged.set(this.key(chatSessionId, absolutePath), entry);
        return entry;
    }

    stagedFor(chatSessionId: string): StagedEntry[] {
        return [...this.staged.values()].filter(e => e.chatSessionId === chatSessionId && e.status === 'staged');
    }

    /**
     * Accept one staged file (D-04 accept-time check): compare the live
     * file against the staged base; on mismatch refuse with a conflict
     * and preserve the proposal, else write the exact backend bytes.
     */
    acceptStaged(chatSessionId: string, absolutePath: string): { written: boolean; conflict?: string } {
        const entry = this.staged.get(this.key(chatSessionId, absolutePath));
        if (!entry || entry.status !== 'staged') {
            return { written: false, conflict: 'no staged proposal for this file' };
        }
        const live = readLiveBytes(absolutePath) ?? '';
        if (live !== entry.baseText) {
            entry.status = 'conflict';
            entry.conflict = 'file changed since the proposal was staged; accept refused, proposal preserved';
            return { written: false, conflict: entry.conflict };
        }
        fs.writeFileSync(absolutePath, entry.proposedText, 'utf8');
        entry.status = 'accepted';
        return { written: true };
    }

    /** Reject one staged file: drop it, disk byte-identical. */
    rejectStaged(chatSessionId: string, absolutePath: string): void {
        const entry = this.staged.get(this.key(chatSessionId, absolutePath));
        if (entry && entry.status === 'staged') {
            entry.status = 'rejected';
        }
    }
}
