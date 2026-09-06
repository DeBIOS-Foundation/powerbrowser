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
 * 16-02 Task 2: mandatory history plus revert (D-06, SPEC R3). Both
 * presets record every applied edit -- gated through acceptStaged, the
 * auto-accept preset through the chat agent's turn-end apply-all -- with
 * per-file diff plus working revert on the existing Change Set plus
 * session-history surfaces (no bespoke widget). Ordering rules hold on
 * both the intercept and the D-03 apply-then-record fallback paths:
 * history append order equals apply order, staging order matches backend
 * emission order, overlapping proposals resolve latest-supersedes with the
 * old entry marked superseded (never merged), zero-edit answers create no
 * entry, and idempotent accept tolerates a backend double-write.
 *
 * Threat mitigations owned here:
 * - T-16-01-01: every staged path is clamped to the workspace root and
 *   refused otherwise (fail-closed negative test in the tracer gate).
 * - T-16-01-02: token-shaped strings are redacted out of diffs and staged
 *   presentation; secrets travel the stdin-pipe path only.
 * - T-16-02-02: the stale-hunk check lives at accept time on the Theia
 *   side: the live file is compared against the staged base and a mismatch
 *   refuses with a conflict while preserving the proposal.
 * - T-16-02-03: overlapping proposals are never merged; the latest
 *   supersedes and the old entry is marked superseded.
 * - T-16-02-04: history diffs pass through the same redaction.
 * - D-04: accept-time live-file comparison (see acceptStaged); revert
 *   applies the same rule (see revertApplied).
 */

export type StagedStatus = 'staged' | 'accepted' | 'rejected' | 'conflict' | 'superseded';

/** Which review preset applied a history entry (mirrors the frontend store). */
export type OpenCodePreset = 'gated' | 'auto-accept';

/** The diff-carrying subset of an ACP permission ask worth staging. */
export interface PermissionAsk {
    kind: string;
    path?: string;
    oldText?: string;
    newText?: string;
}

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

/** One applied edit: the mandatory revertible history record (SPEC R3). */
export interface HistoryEntry {
    chatSessionId: string;
    /** Absolute workspace path. */
    path: string;
    /** Live bytes before the apply ('' when the file did not exist). */
    baseText: string;
    /** Exact bytes written. */
    appliedText: string;
    /** Redacted presentation diff. */
    diff: string;
    /** Which preset applied it. */
    preset: OpenCodePreset;
    /** Intercept applied through the queue; fallback recorded an outside write. */
    via: 'intercept' | 'fallback';
    /** Apply sequence: history append order equals apply order. */
    order: number;
    reverted: boolean;
    revertConflict?: string;
    diskWriteFailed?: boolean;
}

/**
 * Failure guard name for the history write. When the history write fails
 * the apply is blocked and this failure is surfaced -- an edit is never
 * applied silently without its history record. Kept as a named const so
 * the preset gate asserts the guard by name.
 */
export const historyWriteFailure = 'history-write-failed: apply blocked, proposal preserved';

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
    /** Superseded proposals: marked, preserved, never merged, never applied. */
    protected superseded: StagedEntry[] = [];
    /** Mandatory history in apply order (append order equals apply order). */
    protected history: HistoryEntry[] = [];
    protected nextOrder = 0;
    /** Every permission ask, allowed or denied -- the audit trail. */
    protected permissionLog: { tool: string; verdict: 'allow-once' | 'reject' }[] = [];

    protected key(chatSessionId: string, absolutePath: string): string {
        return `${chatSessionId}::${absolutePath}`;
    }

    /**
     * ACP `session/request_permission` handler. Gated default per D-05.
     *
     * Load-bearing double-write finding (live probe, installed 1.18.25):
     * replying `selected/once` to an edit ask makes opencode write the
     * file to disk itself AFTER the delegated `fs/write_text_file`
     * returns -- approval can never gate disk. So edit-shaped asks are
     * staged from the ask's own diff payload and then REJECTED: the turn
     * still ends normally, the proposal sits in the queue, and disk stays
     * untouched until accept. Read-shaped asks without a diff are allowed
     * once (no disk effect); everything that executes is rejected
     * fail-closed. Every verdict is logged either way.
     */
    requestPermission(tool: string, ask?: PermissionAsk, chatSessionId?: string, workspaceRoot?: string): 'allow-once' | 'reject' {
        const editShaped = /^(edit|write|patch|create)$/i.test(tool) || /^(edit|write|patch|create)$/i.test(ask?.kind ?? '');
        if (editShaped && ask?.path !== undefined && ask.newText !== undefined && chatSessionId && workspaceRoot) {
            this.stageProposal(chatSessionId, workspaceRoot, ask.path, ask.newText);
            this.permissionLog.push({ tool, verdict: 'reject' });
            return 'reject';
        }
        if (editShaped) {
            // Diff-carrying ask without a staging context: safest is reject.
            this.permissionLog.push({ tool, verdict: 'reject' });
            return 'reject';
        }
        const readShaped = /^(read|glob|grep|ls)$/i.test(tool);
        const verdict = readShaped ? 'allow-once' : 'reject';
        this.permissionLog.push({ tool, verdict });
        return verdict;
    }

    getPermissionLog(): ReadonlyArray<{ tool: string; verdict: 'allow-once' | 'reject' }> {
        return this.permissionLog;
    }

    /**
     * ACP `fs/write_text_file` handler: the delegated write. Idempotent
     * safety net beside ask-staging above -- if a delegation ever arrives
     * (older binary, permissive config), it stages under the same key
     * instead of touching disk. Zero-edit proposals create no entry.
     */
    writeTextFile(chatSessionId: string, workspaceRoot: string, candidatePath: string, content: string): StagedEntry | undefined {
        return this.stageProposal(chatSessionId, workspaceRoot, candidatePath, content);
    }

    /** Shared stage path: clamp, drop zero-edits, redact presentation. */
    protected stageProposal(
        chatSessionId: string,
        workspaceRoot: string,
        candidatePath: string,
        newText: string
    ): StagedEntry | undefined {
        const absolutePath = clampStagedPath(workspaceRoot, candidatePath);
        // Base is always the live bytes at stage time, so the D-04
        // accept-time comparison is meaningful regardless of which
        // channel (ask or delegated write) delivered the proposal.
        const live = readLiveBytes(absolutePath) ?? '';
        if (live === newText) {
            return undefined;
        }
        const mapKey = this.key(chatSessionId, absolutePath);
        const existing = this.staged.get(mapKey);
        if (existing && (existing.status === 'staged' || existing.status === 'conflict')) {
            if (existing.proposedText === newText) {
                // Idempotent re-stage (backend double-write): the identical
                // proposal reuses its entry instead of superseding itself.
                return existing;
            }
            // Latest supersedes (T-16-02-03): the old entry is marked and
            // preserved, never merged into the new proposal. Delete-then-set
            // keeps staging order on the latest emission.
            existing.status = 'superseded';
            this.superseded.push(existing);
            this.staged.delete(mapKey);
        } else if (existing) {
            // Terminal entries (accepted/rejected) never block a follow-up
            // proposal; history already preserves the applied bytes.
            this.staged.delete(mapKey);
        }
        const rawDiff = renderUnifiedDiff(absolutePath, live, newText);
        const entry: StagedEntry = {
            chatSessionId,
            path: absolutePath,
            baseText: live,
            proposedText: newText,
            diff: redactSecretStrings(rawDiff).text,
            status: 'staged',
        };
        this.staged.set(mapKey, entry);
        return entry;
    }

    stagedFor(chatSessionId: string): StagedEntry[] {
        return [...this.staged.values()].filter(e => e.chatSessionId === chatSessionId && e.status === 'staged');
    }

    /** Superseded proposals for a session, oldest first. */
    supersededFor(chatSessionId: string): StagedEntry[] {
        return this.superseded.filter(e => e.chatSessionId === chatSessionId);
    }

    /** Mandatory history for a session in apply order. */
    historyFor(chatSessionId: string): HistoryEntry[] {
        return this.history.filter(e => e.chatSessionId === chatSessionId);
    }

    /**
     * The single history write site. Protected so the preset gate proves
     * the historyWriteFailure guard behaviorally by faulting exactly this
     * method: when it throws, the apply is blocked and surfaced, never
     * applied silently.
     */
    protected appendHistory(init: Omit<HistoryEntry, 'order' | 'reverted'>): HistoryEntry {
        const entry: HistoryEntry = { ...init, order: this.nextOrder++, reverted: false };
        this.history.push(entry);
        return entry;
    }

    protected markLastHistoryDiskWriteFailed(chatSessionId: string, absolutePath: string): void {
        for (let i = this.history.length - 1; i >= 0; i--) {
            const entry = this.history[i];
            if (entry.chatSessionId === chatSessionId && entry.path === absolutePath && entry.diskWriteFailed !== true) {
                entry.diskWriteFailed = true;
                return;
            }
        }
    }

    /**
     * Accept one staged file (D-04 accept-time check): compare the live
     * file against the staged base; on mismatch refuse with a conflict
     * and preserve the proposal, else record history and write the exact
     * backend bytes. History is written BEFORE disk: when the history
     * write fails the apply is blocked with historyWriteFailure and the
     * proposal stays staged -- never applied silently. Idempotent: an
     * already-accepted entry whose bytes read back identical reports
     * written, tolerating a backend double-write.
     */
    acceptStaged(chatSessionId: string, absolutePath: string, preset: OpenCodePreset = 'gated'): { written: boolean; conflict?: string } {
        const entry = this.staged.get(this.key(chatSessionId, absolutePath));
        if (!entry) {
            return { written: false, conflict: 'no staged proposal for this file' };
        }
        if (entry.status === 'rejected' || entry.status === 'superseded') {
            return { written: false, conflict: 'proposal is no longer current; a newer proposal or a rejection replaced it' };
        }
        const live = readLiveBytes(absolutePath) ?? '';
        if (entry.status === 'accepted') {
            return live === entry.proposedText
                ? { written: true }
                : { written: false, conflict: 'file changed after apply; history preserves the applied bytes' };
        }
        if (live !== entry.baseText) {
            entry.status = 'conflict';
            entry.conflict = 'file changed since the proposal was staged; accept refused, proposal preserved';
            return { written: false, conflict: entry.conflict };
        }
        const safePreset: OpenCodePreset = preset === 'auto-accept' ? 'auto-accept' : 'gated';
        try {
            this.appendHistory({
                chatSessionId,
                path: absolutePath,
                baseText: entry.baseText,
                appliedText: entry.proposedText,
                diff: entry.diff,
                preset: safePreset,
                via: 'intercept',
            });
        } catch (err) {
            throw new Error(`${historyWriteFailure}: ${(err as Error).message}`);
        }
        try {
            fs.writeFileSync(absolutePath, entry.proposedText, 'utf8');
        } catch (err) {
            this.markLastHistoryDiskWriteFailed(chatSessionId, absolutePath);
            entry.status = 'staged';
            throw err;
        }
        entry.status = 'accepted';
        return { written: true };
    }

    /**
     * D-03 apply-then-record fallback, strictly behind the intercept path:
     * for writes the backend applied to disk itself (older binary, a path
     * the ask channel never carried), record the observable change into
     * history on the same ordering and redaction rules. NEVER writes disk
     * itself -- it only consumes a matching staged entry (fulfilled
     * externally, so a later accept cannot double-write) and appends
     * history. Zero observable change records nothing.
     */
    recordExternalApply(
        chatSessionId: string,
        workspaceRoot: string,
        candidatePath: string,
        preset: OpenCodePreset = 'gated'
    ): HistoryEntry | undefined {
        const absolutePath = clampStagedPath(workspaceRoot, candidatePath);
        const live = readLiveBytes(absolutePath) ?? '';
        const pending = this.staged.get(this.key(chatSessionId, absolutePath));
        let baseText = '';
        if (pending && (pending.status === 'staged' || pending.status === 'conflict')) {
            baseText = pending.baseText;
            pending.status = 'accepted';
        }
        if (live === baseText) {
            return undefined;
        }
        const safePreset: OpenCodePreset = preset === 'auto-accept' ? 'auto-accept' : 'gated';
        const rawDiff = renderUnifiedDiff(absolutePath, baseText, live);
        return this.appendHistory({
            chatSessionId,
            path: absolutePath,
            baseText,
            appliedText: live,
            diff: redactSecretStrings(rawDiff).text,
            preset: safePreset,
            via: 'fallback',
        });
    }

    /**
     * Revert one applied file from history (D-06 reuse, SPEC R3): writes
     * the pre-apply bytes back and marks the entry reverted. Mirrors the
     * D-04 accept rule -- when the live file no longer matches the applied
     * bytes (concurrent external edit) the revert is refused with a
     * conflict and history is preserved. End-to-end behavior through live
     * session surfaces is the held-out R3 backstop (preset gate STAGED).
     */
    revertApplied(chatSessionId: string, absolutePath: string): { reverted: boolean; conflict?: string } {
        const entries = this.history.filter(e => e.chatSessionId === chatSessionId && e.path === absolutePath && !e.reverted);
        const latest = entries[entries.length - 1];
        if (!latest) {
            return { reverted: false, conflict: 'no applied history for this file' };
        }
        const live = readLiveBytes(absolutePath) ?? '';
        if (live !== latest.appliedText) {
            latest.revertConflict = 'file changed after apply; revert refused, history preserved';
            return { reverted: false, conflict: latest.revertConflict };
        }
        fs.writeFileSync(absolutePath, latest.baseText, 'utf8');
        latest.reverted = true;
        return { reverted: true };
    }

    /** Reject one staged file: drop it, disk byte-identical. */
    rejectStaged(chatSessionId: string, absolutePath: string): void {
        const entry = this.staged.get(this.key(chatSessionId, absolutePath));
        if (entry && entry.status === 'staged') {
            entry.status = 'rejected';
        }
    }
}
