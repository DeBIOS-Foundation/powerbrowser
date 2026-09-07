import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, BaseWidget, Message, OpenHandler, Widget, WidgetManager } from '@theia/core/lib/browser';
import { Emitter, Event as TheiaEvent } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
// Resolved through src/, not './': the build is `tsc -b` alone, which emits
// no CSS into lib/, so a lib-relative specifier would name a file that is
// never written (the organising-widget / chrome-bar precedent).
import '../../src/browser/web-tab.css';

/**
 * GUI-02 (14.1-01): the in-shell web tab -- a main-area placeholder widget
 * whose page is rendered by a chrome-owned `<xul:browser>` overlay that
 * `PowerBrowserAPI.sys.mjs` keeps aligned with this widget's node. The
 * frontend owns tab identity, the strip title and geometry; chrome owns the
 * docshell, the navigation and the tab-store row. The two halves talk over
 * the existing PowerBrowserGroup actor channel (frontend -> chrome as
 * `PowerBrowserGroupRequest` DOM events, chrome -> frontend as
 * `PowerBrowserWebTabState` events re-dispatched by the actor child).
 *
 * The widget is deliberately NOT `ExtractableWidget` (the overlay lives in
 * the shell window and cannot follow a widget into a dependent window) and
 * NOT `StatefulWidget` (the frontend origin changes every launch, so a
 * cross-launch layout restore has nothing to hydrate; named setups restore
 * tabs through the opener instead). UI-SPEC A12.
 */

export const WEB_TAB_FACTORY_ID = 'powerbrowser.web-tab';
/** The one non-http target chrome admits: a bare New Tab. Never shown in copy. */
export const EMPTY_PAGE_URL = 'about:blank';
export const WEB_TAB_STATE_EVENT = 'PowerBrowserWebTabState';
/** Ack budget for the requests whose reply decides UI state; matches the group channel's. */
export const WEB_TAB_ACK_TIMEOUT_MS = 5000;
export const WEB_TAB_OPEN_HANDLER_ID = 'powerbrowser.web-tab-open-handler';

/**
 * Wire names of the group channel. Spelled locally rather than imported for
 * the reason `browser-window-command.ts` already records: the canonical
 * exports live in `@powerbrowser/modes`, which depends on this package, so
 * importing back would close a package cycle.
 */
const GROUP_REQUEST_EVENT = 'PowerBrowserGroupRequest';
const GROUP_RESPONSE_EVENT = 'PowerBrowserGroupResponse';

/** Copywriting Contract, verbatim. Text nodes only, never markup. */
const NEW_TAB_LABEL = 'New Tab';
const EMPTY_STATE_COPY = 'Type an address above to get started.';
const LOST_VIEW_COPY = "Power Browser can't show this page right now. Choose Reload to try again, or close this tab.";

/**
 * Occlusion policy (UI-SPEC A8, Research Pitfall 3). The overlay is
 * composited above the whole Theia frame, so any layer Theia portals to
 * `document.body` -- the chrome bar's suggestion dropdown, the quick input
 * / command palette, a dialog overlay, a menu -- would vanish behind the
 * page. While one of these is rendered, every visible web tab publishes
 * visible=false and shows its flat dark surface instead. `getClientRects`
 * rather than mere presence: Theia keeps some of these in the DOM hidden.
 */
const BLOCKING_LAYER_SELECTOR = '.pb-chrome-bar-dropdown, .quick-input-widget, .lm-Widget.dialogOverlay, .lm-Menu';

function blockingLayerOpen(): boolean {
    return Array.from(document.querySelectorAll(BLOCKING_LAYER_SELECTOR))
        .some(element => element.getClientRects().length > 0);
}

/** Every attached web tab, so one body observer can re-publish all of them. */
const attachedWebTabs = new Set<WebTabWidget>();
let bodyObserver: MutationObserver | undefined;

/**
 * One MutationObserver on the body for every web tab, created on first
 * attach and never disconnected. It fires on a lot -- every class/style
 * flip anywhere -- but each publish is rAF-coalesced and deduped against
 * the last message sent, so the cost is bounded at one rect read per frame
 * per widget, and hide/restore both land within one animation frame.
 */
function ensureBodyObserver(): void {
    if (bodyObserver) {
        return;
    }
    bodyObserver = new MutationObserver(() => {
        for (const widget of attachedWebTabs) {
            widget.publish();
        }
    });
    bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
    });
}

export interface WebTabOptions {
    /** Per-session counter minted by the open handler; lives here and never in a URI. */
    id: string;
    url: string;
}

export interface WebTabState {
    url: string;
    title: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
}

/** The eight kinds `handleGroupMutation` serves for web tabs; one stable set for the bridge gate. */
export type WebTabMessage =
    | { kind: 'webTabOpen'; tabId: string; url: string }
    | { kind: 'webTabGeometry'; tabId: string; x: number; y: number; w: number; h: number; visible: boolean }
    | { kind: 'webTabNavigate'; tabId: string; url: string }
    | { kind: 'webTabBack'; tabId: string }
    | { kind: 'webTabForward'; tabId: string }
    | { kind: 'webTabReload'; tabId: string }
    | { kind: 'webTabClose'; tabId: string }
    | { kind: 'webTabFocus'; tabId: string };

export interface WebTabReply {
    ok: boolean;
    where?: string;
    reason?: string;
    message?: string;
}

/**
 * The frontend end of the two-way bridge. `send` is fire-and-forget (a
 * requestId is supplied so the child's reply is well-formed, but no waiter
 * is registered and every correlator drops an unmatched response);
 * `request` awaits the ack with a timeout, for the few messages whose reply
 * decides UI state. One window-level listener receives every chrome push
 * and routes it to the widget registered under its tabId.
 *
 * Never read `dispatchEvent`'s return value as "chrome took it" -- measured
 * false twice in this tree even when chrome had acted on the message.
 */
@injectable()
export class WebTabChannel {

    private seq = 0;
    private readonly widgets = new Map<string, WebTabWidget>();
    private readonly focusAddressEmitter = new Emitter<void>();

    /** Fired when chrome's reserved accel+L asks the frontend to focus the address pill. */
    readonly onDidRequestFocusAddress: TheiaEvent<void> = this.focusAddressEmitter.event;

    @postConstruct()
    protected init(): void {
        window.addEventListener(WEB_TAB_STATE_EVENT, this.onState);
    }

    register(tabId: string, widget: WebTabWidget): void {
        this.widgets.set(tabId, widget);
    }

    unregister(tabId: string): void {
        this.widgets.delete(tabId);
    }

    send(msg: WebTabMessage): void {
        this.dispatch(this.requestId(msg.kind), msg);
    }

    request(msg: WebTabMessage): Promise<WebTabReply> {
        return new Promise<WebTabReply>(resolve => {
            const requestId = this.requestId(msg.kind);
            const settle = (reply: WebTabReply): void => {
                window.removeEventListener(GROUP_RESPONSE_EVENT, onResponse);
                window.clearTimeout(timer);
                resolve(reply);
            };
            const onResponse = (event: Event): void => {
                const detail = (event as CustomEvent).detail as
                    { requestId?: unknown; reply?: unknown } | undefined;
                if (!detail || detail.requestId !== requestId) {
                    return;
                }
                const reply = detail.reply;
                settle(reply && typeof reply === 'object'
                    ? reply as WebTabReply
                    : { ok: false, reason: 'validation', message: 'malformed reply' });
            };
            const timer = window.setTimeout(() => settle({ ok: false, reason: 'timeout' }), WEB_TAB_ACK_TIMEOUT_MS);
            window.addEventListener(GROUP_RESPONSE_EVENT, onResponse);
            this.dispatch(requestId, msg);
        });
    }

    private requestId(kind: string): string {
        return `web-tab-${kind}-${Date.now().toString(36)}-${(this.seq += 1)}`;
    }

    private dispatch(requestId: string, msg: WebTabMessage): void {
        // `document` target + bubbles:true are both load-bearing: the actor
        // child's listener sits on the window root, which a non-bubbling
        // event dispatched on `window` never reaches (GUI-DEFECTS item 10).
        document.dispatchEvent(new CustomEvent(GROUP_REQUEST_EVENT, {
            bubbles: true,
            detail: { requestId, msg },
        }));
    }

    private readonly onState = (event: Event): void => {
        try {
            const detail = (event as CustomEvent).detail as
                { kind?: unknown; tabId?: unknown; url?: unknown; title?: unknown; loading?: unknown; canGoBack?: unknown; canGoForward?: unknown } | undefined;
            if (!detail || typeof detail !== 'object') {
                return;
            }
            if (detail.kind === 'focusAddress') {
                this.focusAddressEmitter.fire();
                return;
            }
            if (detail.kind !== 'state' || typeof detail.tabId !== 'string') {
                return;
            }
            const widget = this.widgets.get(detail.tabId);
            if (!widget) {
                return;
            }
            widget.applyState({
                url: typeof detail.url === 'string' ? detail.url : widget.url,
                title: typeof detail.title === 'string' ? detail.title : '',
                loading: detail.loading === true,
                canGoBack: detail.canGoBack === true,
                canGoForward: detail.canGoForward === true,
            });
        } catch (error) {
            console.error('[@powerbrowser/tab-uris] web-tab state dispatch failed:', error);
        }
    };
}

/**
 * The placeholder. Its node is what Lumino lays out; chrome paints the page
 * over exactly that rect. Geometry is published on every lifecycle hook
 * that can move or resize the node, coalesced to one animation frame per
 * widget with the latest rect winning, and skipped when byte-identical to
 * the last message sent.
 */
@injectable()
export class WebTabWidget extends BaseWidget {

    tabId: string;
    url: string;
    pageTitle = '';
    loading = false;
    canGoBack = false;
    canGoForward = false;
    lostView = false;

    protected readonly stateEmitter = new Emitter<WebTabState>();
    readonly onDidChangeState: TheiaEvent<WebTabState> = this.stateEmitter.event;

    @inject(WebTabChannel)
    protected readonly channel: WebTabChannel;

    protected raf = 0;
    protected lastSent = '';
    protected resizeObserver: ResizeObserver | undefined;
    protected listening = false;
    protected stateNode: HTMLDivElement;

    get hasPage(): boolean {
        return this.url !== EMPTY_PAGE_URL;
    }

    /** Reload enablement (UI-SPEC A7 + A10): a page to reload, or a lost view whose open Reload re-issues. */
    get canReload(): boolean {
        return this.hasPage || this.lostView;
    }

    init(options: WebTabOptions): void {
        // The Theia widget id -- an internal identifier, never shown.
        this.id = `${WEB_TAB_FACTORY_ID}:${options.id}`;
        this.tabId = options.id;
        this.url = options.url;
        this.title.closable = true;
        this.title.iconClass = 'codicon codicon-globe';
        this.node.tabIndex = 0;
        this.addClass('pb-web-tab');
        // The one child: the empty-state / lost-view line, a text node
        // only. Live so a screen reader hears the state when it changes.
        this.stateNode = document.createElement('div');
        this.stateNode.className = 'pb-web-tab-state';
        this.stateNode.setAttribute('aria-live', 'polite');
        this.node.appendChild(this.stateNode);
        // Keyboard entry into the page (UI-SPEC A14): Enter or Space on the
        // focused placeholder hands focus to the overlay; leaving it again
        // is chrome's reserved accel+L feeding onDidRequestFocusAddress.
        this.node.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.focusPage();
            }
        });
        this.channel.register(this.tabId, this);
        this.refreshTitle();
        this.renderState();
    }

    /** The body text state. Fixed literals; the tab counter, empty-page URL, kinds and error text never reach it. */
    protected renderState(): void {
        if (this.lostView) {
            this.stateNode.textContent = LOST_VIEW_COPY;
            this.stateNode.classList.add('is-lost');
        } else if (!this.hasPage) {
            this.stateNode.textContent = EMPTY_STATE_COPY;
            this.stateNode.classList.remove('is-lost');
        } else {
            this.stateNode.textContent = '';
            this.stateNode.classList.remove('is-lost');
        }
    }

    protected setLostView(lost: boolean): void {
        if (this.lostView === lost) {
            return;
        }
        this.lostView = lost;
        this.renderState();
    }

    /** A reply that means chrome no longer renders (or never rendered) this tab. */
    protected static lostReply(reply: WebTabReply): boolean {
        return reply.ok !== true || reply.where === 'unknown-tab';
    }

    /** Label: page title -> page URL -> "New Tab". Caption: URL or "New Tab". Text values only, never markup. */
    protected refreshTitle(): void {
        this.title.label = this.pageTitle || (this.hasPage ? this.url : NEW_TAB_LABEL);
        this.title.caption = this.hasPage ? this.url : NEW_TAB_LABEL;
        this.node.setAttribute('aria-label', this.title.label);
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        attachedWebTabs.add(this);
        ensureBodyObserver();
        // Lost-view detection (UI-SPEC A10/A11): the open is awaited, and a
        // refusal, a nack or silence (timeout included) marks the view lost.
        void this.channel.request({ kind: 'webTabOpen', tabId: this.tabId, url: this.url })
            .then(reply => this.setLostView(reply.ok !== true));
        this.publish();
        if (!this.listening) {
            this.listening = true;
            this.resizeObserver = new ResizeObserver(() => this.publish());
            this.resizeObserver.observe(this.node);
            const onWindowResize = (): void => this.publish();
            window.addEventListener('resize', onWindowResize);
            this.toDispose.push({ dispose: () => window.removeEventListener('resize', onWindowResize) });
        }
    }

    protected onResize(msg: Widget.ResizeMessage): void {
        super.onResize(msg);
        this.publish();
    }

    protected onAfterShow(msg: Message): void {
        super.onAfterShow(msg);
        this.publish();
    }

    protected onBeforeHide(msg: Message): void {
        super.onBeforeHide(msg);
        this.publish();
    }

    protected onBeforeDetach(msg: Message): void {
        super.onBeforeDetach(msg);
        this.publish();
    }

    protected onCloseRequest(msg: Message): void {
        this.channel.send({ kind: 'webTabClose', tabId: this.tabId });
        this.channel.unregister(this.tabId);
        super.onCloseRequest(msg);
    }

    dispose(): void {
        if (this.isDisposed) {
            return;
        }
        attachedWebTabs.delete(this);
        cancelAnimationFrame(this.raf);
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        this.channel.unregister(this.tabId);
        // The window resize listener is on toDispose; the body observer is
        // shared and lives for the session.
        super.dispose();
    }

    /** Coalesced geometry publish: one rAF per widget, latest rect wins, identical messages skipped. */
    publish(): void {
        cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(() => {
            if (this.isDisposed) {
                return;
            }
            const r = this.node.getBoundingClientRect();
            const msg: WebTabMessage = {
                kind: 'webTabGeometry',
                tabId: this.tabId,
                x: Math.round(r.left),
                y: Math.round(r.top),
                w: Math.round(r.width),
                h: Math.round(r.height),
                visible: this.isAttached && this.isVisible && this.hasPage && !blockingLayerOpen(),
            };
            const key = JSON.stringify(msg);
            if (key === this.lastSent) {
                return;
            }
            this.lastSent = key;
            this.channel.send(msg);
        });
    }

    async navigate(url: string): Promise<WebTabReply> {
        this.url = url;
        this.refreshTitle();
        this.renderState();
        // The tab now has a page, so the overlay becomes visible.
        this.publish();
        return this.settle(await this.channel.request({ kind: 'webTabNavigate', tabId: this.tabId, url }));
    }

    async back(): Promise<WebTabReply> {
        return this.settle(await this.channel.request({ kind: 'webTabBack', tabId: this.tabId }));
    }

    async forward(): Promise<WebTabReply> {
        return this.settle(await this.channel.request({ kind: 'webTabForward', tabId: this.tabId }));
    }

    /**
     * Reload; on a lost view this re-issues the open for the current URL
     * instead (the contracted "Choose Reload to try again" affordance), and
     * republishes geometry from scratch so the re-created overlay gets a
     * rect the dedupe would otherwise have skipped.
     */
    async reload(): Promise<WebTabReply> {
        if (this.lostView) {
            const reply = await this.channel.request({ kind: 'webTabOpen', tabId: this.tabId, url: this.url });
            this.setLostView(reply.ok !== true);
            this.lastSent = '';
            this.publish();
            return reply;
        }
        return this.settle(await this.channel.request({ kind: 'webTabReload', tabId: this.tabId }));
    }

    /** Folds a navigation reply into the lost-view state and hands it back. */
    protected settle(reply: WebTabReply): WebTabReply {
        this.setLostView(WebTabWidget.lostReply(reply));
        return reply;
    }

    focusPage(): void {
        this.channel.send({ kind: 'webTabFocus', tabId: this.tabId });
    }

    applyState(state: WebTabState): void {
        this.url = state.url;
        this.pageTitle = state.title;
        this.loading = state.loading;
        this.canGoBack = state.canGoBack;
        this.canGoForward = state.canGoForward;
        if (this.loading) {
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.title.iconClass = reduced ? 'codicon codicon-loading' : 'codicon codicon-loading codicon-modifier-spin';
        } else {
            this.title.iconClass = 'codicon codicon-globe';
        }
        this.refreshTitle();
        this.renderState();
        this.stateEmitter.fire(state);
    }
}

/** Per-session tab counter; lives only in widget construction options, never in a URI (docs/URI-SCHEMES.md). */
let nextTabSeq = 0;

/**
 * Opens `http:`/`https:` URIs (and the empty page) as in-shell web tabs.
 * Priority 1000 clears stock `HttpOpenHandler` at 500 -- whose `open()`
 * hands the URI to `windowService.openNewWindow(..., { external: true })`,
 * i.e. an OS window -- while staying under `defaultHandlerPriority`, the
 * same reasoning as `view-open-handler.ts`. Every opener in the tree
 * (chrome bar, setups restore, Panorama dive, a link) reaches this through
 * `OpenerService`; none of them needs to know a web tab exists.
 */
@injectable()
export class WebTabOpenHandler implements OpenHandler {

    readonly id = WEB_TAB_OPEN_HANDLER_ID;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    canHandle(uri: URI): number {
        return /^https?$/.test(uri.scheme) || uri.toString(true) === EMPTY_PAGE_URL ? 1000 : 0;
    }

    async open(uri: URI): Promise<WebTabWidget> {
        return this.openUrl(uri.toString(true));
    }

    async openUrl(url: string): Promise<WebTabWidget> {
        const options: WebTabOptions = { id: `wt${++nextTabSeq}`, url };
        const widget = await this.widgetManager.getOrCreateWidget<WebTabWidget>(WEB_TAB_FACTORY_ID, options);
        if (!widget.isAttached) {
            this.shell.addWidget(widget, { area: 'main' });
        }
        await this.shell.activateWidget(widget.id);
        return widget;
    }
}
