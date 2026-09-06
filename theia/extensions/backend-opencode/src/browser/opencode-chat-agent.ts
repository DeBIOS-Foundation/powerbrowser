import { inject, injectable } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import {
    ChangeSetElement,
    ChangeSetImpl,
    ChatAgent,
    ChatAgentLocation,
    MarkdownChatResponseContentImpl,
    MutableChatRequestModel,
} from '@theia/ai-chat/lib/common';
import {
    OpencodeService,
    StagedFileProposal,
} from '../common/opencode-service';

/** The chat-picker id users select. User-visible once shipped. */
export const OPENCODE_CHAT_AGENT_ID = 'OpenCode';

/** Per-request state keys: backend session linkage plus cancellation. */
export const OPENCODE_BACKEND_SESSION_KEY = 'opencode.backendSessionId';
export const OPENCODE_APPENDIX = 'Answer with file edits proposed through the workspace staging queue; keep prose concise.';

/**
 * 16-01 Task 2: the @OpenCode chat agent (D-01/D-03 tracer slice).
 *
 * Registers id `OpenCode` through the ChatAgent token, sends prompts
 * through the common JSON-RPC service path (/services/opencode), and
 * reuses the shared ChatService/variables/skills only -- CLI-owned tools
 * and models stay opencode-side per R6. One Theia chat session maps to
 * one stable backend session id across prompts within the chat; a new
 * chat mints a new backend session (owned by the supervisor).
 *
 * Staged proposals from a turn become Change Set entries grouped per
 * file with the diff carried on the element; accept writes the exact
 * backend bytes, reject drops the entry, zero-edit answers (empty
 * staged list) create no entry.
 */
@injectable()
export class OpencodeChatAgent implements ChatAgent {
    readonly id = OPENCODE_CHAT_AGENT_ID;
    readonly name = 'OpenCode';
    readonly description = 'opencode backend over supervised ACP stdio, with staged per-file review';
    readonly variables: string[] = [];
    readonly prompts = [];
    readonly languageModelRequirements = [];
    readonly agentSpecificVariables = [];
    readonly functions: string[] = [];
    iconClass = 'codicon codicon-hubot';
    locations: ChatAgentLocation[] = [ChatAgentLocation.Panel];
    tags = ['opencode', 'acp'];
    protected systemPromptAppendixTemplate = OPENCODE_APPENDIX;

    @inject(OpencodeService)
    protected readonly backend: OpencodeService;

    async invoke(request: MutableChatRequestModel): Promise<void> {
        const chatSessionId = request.session.id;
        const prompt = `${request.message.request.text}\n\n${this.systemPromptAppendixTemplate}`;
        const cancelled = { value: false };
        const onCancel = () => {
            cancelled.value = true;
            this.backend.cancel(chatSessionId).catch(() => undefined);
        };
        const cancelListener = request.response.cancellationToken.onCancellationRequested(onCancel);
        try {
            const reply = await this.backend.send(prompt, chatSessionId);
            if (cancelled.value) {
                request.response.cancel();
                return;
            }
            // Stable per-chat backend session id, visible for continuity.
            const sessionId: string = reply.backendSessionId;
            request.addData(OPENCODE_BACKEND_SESSION_KEY, sessionId);
            const body = reply.text || '_The backend returned no text for this turn._';
            this.addMarkdown(request, body);
            this.attachStagedElements(request, chatSessionId, reply.staged);
            request.response.complete();
        } catch (err) {
            request.response.error(err as Error);
        } finally {
            cancelListener.dispose();
        }
    }

    /** Structural access: ChatResponseImpl.addContent is public at runtime
     *  but its class is not exported from the model typings. */
    protected addMarkdown(request: MutableChatRequestModel, text: string): void {
        const holder = request.response.response as unknown as {
            addContent(content: unknown): void;
        };
        holder.addContent(new MarkdownChatResponseContentImpl(text));
    }

    protected attachStagedElements(
        request: MutableChatRequestModel,
        chatSessionId: string,
        staged: StagedFileProposal[]
    ): void {
        if (!staged.length) {
            return;
        }
        const elements: ChangeSetElement[] = staged.map(proposal => {
            const uri = new URI(`file://${proposal.path}`);
            const element: ChangeSetElement = {
                uri,
                name: proposal.path,
                type: 'modify',
                state: 'pending',
                additionalInfo: proposal.diff,
                data: { diff: proposal.diff, backend: 'opencode' },
                apply: async () => {
                    const result = await this.backend.acceptStaged(chatSessionId, proposal.path);
                    if (!result.written) {
                        throw new Error(result.conflict ?? 'accept refused');
                    }
                },
                revert: async () => {
                    await this.backend.rejectStaged(chatSessionId, proposal.path);
                },
            };
            return element;
        });
        request.changeSet = new ChangeSetImpl(elements);
    }
}
