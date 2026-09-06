/**
 * GUI-08 (15-01): the tracer Panorama organising widget.
 *
 * Plain-Widget (placeholder idiom -- NOT React; drag needs direct DOM
 * transforms) owning the organising slot behind the same
 * `registerOrganisingSlot` seam. Canvas and tree are two render roots over
 * the ONE GroupModel: flipping the toggle never reloads and never loses
 * selection. The 144px tray is always rendered as the stable ungrouping
 * drop target.
 *
 * Tracer slice ONLY: New Group, header-drag move (150ms-debounced persist
 * with pointerup commit), card dive, last-card-out dissolve. No corner
 * resize, no auto-box on drop, no close-through-tabs beyond the contracted
 * dialog (those are 15-02). Zoom is a pure view transform here -- card data
 * and box bounds are untouched, nothing persists.
 *
 * 15-02: full canvas geometry. Corner resize (16x16 handle, 200x144 live
 * floor, same debounce/commit discipline), the four-gesture auto-box drop
 * matrix (card-onto-card, card-onto-field, card-into-box, card-into-tray)
 * with optimistic paint and contracted rollback, Esc cancelling any geometry
 * gesture with paint reverted and no further persist, dragged-card 0.7 with
 * no transition while dragging, accent target outline (reserved use 7).
 * Card drags ride native HTML5 DnD, so an Esc-cancelled drag fires no drop
 * and persists nothing by construction -- there is no mid-drag paint to
 * revert. Zoom stays a pure view transform: bounds plus card data untouched,
 * thumbnails scaling by CSS, never re-captured.
 *
 * Copy: contracted 15-UI-SPEC.md strings verbatim; no placeholder copy
 * survives. Names render as textContent, never innerHTML.
 */

import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    ConfirmDialog,
    StatusBar,
    StatusBarAlignment,
    Widget,
} from '@theia/core/lib/browser';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';
import pDebounce from 'p-debounce';
import { registerOrganisingSlot } from './mode-descriptors';
import { GroupActorClient } from './group-actor-client';
import { GroupModel, GROUP_BOX_MIN_H, GROUP_BOX_MIN_W, GROUP_TITLE_MAX_CHARS, PanoramaGroup, PanoramaTab } from './group-model';
import { buildTreeSection } from './organising-tree';
import { PANORAMA_CLOSE_GROUP_COMMAND_ID, PANORAMA_NEW_GROUP_COMMAND_ID } from './panorama-commands';
import { PanoramaCommandHandler } from './panorama-commands';
import './modes.css';

type OrganisingView = 'canvas' | 'tree';

const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200];
const DEFAULT_ZOOM_INDEX = 3;

@injectable()
export class OrganisingWidget extends Widget {
    static readonly ID = 'powerbrowser.modes.organising';

    @inject(GroupModel)
    protected readonly model: GroupModel;

    @inject(GroupActorClient)
    protected readonly actor: GroupActorClient;

    @inject(GroupQueryService)
    protected readonly reader: GroupQueryService;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    protected view: OrganisingView = 'canvas';
    protected zoomIndex = DEFAULT_ZOOM_INDEX;
    protected editingGroupId: string | undefined;
    protected suppressRender = false;
    protected moveState: { id: string; startX: number; startY: number; baseX: number; baseY: number } | undefined;
    protected resizeState: { id: string; startX: number; startY: number; baseW: number; baseH: number } | undefined;
    protected dragCard: { uri: string; fromGroup: string | null } | undefined;
    /** Invalidates trailing debounced persists (Esc cancel, gesture end). */
    protected geometrySeq = 0;

    protected readonly debouncedMove = pDebounce((id: string, x: number, y: number, seq: number) => this.persistMove(id, x, y, seq), 150);
    protected readonly debouncedResize = pDebounce((id: string, w: number, h: number, seq: number) => this.persistResize(id, w, h, seq), 150);

    protected toolbar!: HTMLElement;
    protected canvasToggle!: HTMLButtonElement;
    protected treeToggle!: HTMLButtonElement;
    protected zoomCluster!: HTMLElement;
    protected zoomReadout!: HTMLElement;
    protected loadBar!: HTMLElement;
    protected saveBar!: HTMLElement;
    protected canvasHost!: HTMLElement;
    protected canvasLayer!: HTMLElement;
    protected canvasRoot!: HTMLElement;
    protected treeRoot!: HTMLElement;
    protected trayRoot!: HTMLElement;

    constructor() {
        super();
        this.id = OrganisingWidget.ID;
        this.title.label = 'Organising';
        this.title.closable = false;
        this.addClass('pb-modes-organising');
        this.buildStaticDom();
        this.model.onDidChange(() => {
            if (!this.suppressRender) {
                this.render();
            }
        });
        this.render();
        void this.initialize();
    }

    // PanoramaCommandHandler surface (delegated by the contribution below).

    async createNewGroup(): Promise<void> {
        try {
            const group = await this.model.createGroup(this.actor);
            this.editingGroupId = group.id;
            this.render();
            this.focusRename(group.id);
        } catch (error) {
            console.error('[@powerbrowser/modes] new-group failed:', error);
            this.render();
        }
    }

    async closeGroupById(id: string): Promise<void> {
        const group = this.model.listGroups().find(candidate => candidate.id === id);
        if (!group) {
            return;
        }
        const count = this.model.getTabs(id).length;
        const closeMsg = count === 1
            ? `Close "${group.title}"? Its 1 tab will close too. You can't undo this.`
            : `Close "${group.title}"? Its ${count} tabs will close too. You can't undo this.`;
        let confirmed: boolean | undefined = false;
        try {
            const dialog = new ConfirmDialog({
                title: 'Close Group',
                msg: closeMsg,
                ok: 'Close Group',
                cancel: 'Cancel',
            });
            dialog.addClass('pb-org-close-confirm');
            confirmed = await dialog.open();
        } catch (error) {
            console.error('[@powerbrowser/modes] close-group dialog failed:', error);
            return;
        }
        if (!confirmed) {
            return;
        }
        try {
            const closed = await this.model.closeGroup(this.actor, id);
            if (closed) {
                await this.flash(`Group "${closed.name}" closed.`);
            }
            this.render();
        } catch (error) {
            console.error('[@powerbrowser/modes] close-group failed:', error);
            this.render();
        }
    }

    showCanvasView(): void {
        this.view = 'canvas';
        this.render();
    }

    showTreeView(): void {
        this.view = 'tree';
        this.render();
    }

    async retrySave(): Promise<void> {
        try {
            await this.model.retryPending(this.actor);
        } catch (error) {
            console.error('[@powerbrowser/modes] group save retry failed:', error);
        }
        this.render();
    }

    // Loading.

    protected async initialize(): Promise<void> {
        try {
            await this.model.load(this.reader);
        } catch (error) {
            console.error('[@powerbrowser/modes] group load failed:', error);
        }
        this.render();
    }

    // Rendering: one model, two roots plus the always-rendered tray.

    protected render(): void {
        if (this.suppressRender) {
            return;
        }
        this.renderToolbar();
        this.renderBars();
        this.renderCanvas();
        this.renderTree();
        this.renderTray();
    }

    protected renderToolbar(): void {
        this.canvasToggle.classList.toggle('is-active', this.view === 'canvas');
        this.canvasToggle.setAttribute('aria-pressed', this.view === 'canvas' ? 'true' : 'false');
        this.treeToggle.classList.toggle('is-active', this.view === 'tree');
        this.treeToggle.setAttribute('aria-pressed', this.view === 'tree' ? 'true' : 'false');
        this.zoomCluster.hidden = this.view !== 'canvas';
        this.zoomReadout.textContent = `${ZOOM_STEPS[this.zoomIndex]}%`;
        this.canvasHost.hidden = this.view !== 'canvas';
        this.treeRoot.hidden = this.view !== 'tree';
    }

    protected renderBars(): void {
        const loading = !this.model.isLoaded && !this.model.hasLoadFailed;
        this.loadBar.hidden = loading || !this.model.hasLoadFailed;
        this.saveBar.hidden = !this.model.hasPendingWrite;
    }

    protected renderCanvas(): void {
        this.canvasLayer.style.transform = `scale(${ZOOM_STEPS[this.zoomIndex] / 100})`;
        while (this.canvasRoot.firstChild) {
            this.canvasRoot.removeChild(this.canvasRoot.firstChild);
        }
        if (!this.model.isLoaded) {
            for (let i = 0; i < 2; i += 1) {
                const ghost = document.createElement('div');
                ghost.className = 'pb-org-skeleton';
                ghost.setAttribute('aria-hidden', 'true');
                this.canvasRoot.append(ghost);
            }
            return;
        }
        const groups = this.model.listGroups();
        if (groups.length === 0) {
            this.canvasRoot.append(this.buildEmpty(
                'No tab groups',
                'There are no tab groups yet — choose New Group, or drag a tab onto the canvas to start one.',
                true
            ));
            return;
        }
        for (const group of groups) {
            this.canvasRoot.append(this.buildBox(group));
        }
    }

    protected renderTree(): void {
        while (this.treeRoot.firstChild) {
            this.treeRoot.removeChild(this.treeRoot.firstChild);
        }
        if (!this.model.isLoaded) {
            return;
        }
        const groups = this.model.listGroups();
        if (groups.length === 0) {
            this.treeRoot.append(this.buildEmpty(
                'No tab groups',
                'There are no tab groups yet — choose New Group to start one.',
                true
            ));
            return;
        }
        for (const group of groups) {
            this.treeRoot.append(this.buildSection(group));
        }
    }

    protected renderTray(): void {
        while (this.trayRoot.firstChild) {
            this.trayRoot.removeChild(this.trayRoot.firstChild);
        }
        const label = document.createElement('span');
        label.className = 'pb-org-tray-label';
        label.textContent = 'Ungrouped';
        this.trayRoot.append(label);
        const cards = document.createElement('div');
        cards.className = 'pb-org-tray-cards';
        const tabs = this.model.listUngrouped();
        if (this.model.isLoaded && tabs.length === 0) {
            const caption = document.createElement('span');
            caption.className = 'pb-org-tray-empty';
            caption.textContent = 'No ungrouped tabs — drag a tab here to ungroup it.';
            cards.append(caption);
        }
        for (let i = 0; i < tabs.length; i += 1) {
            cards.append(this.buildCard(tabs[i], null, i === 0));
        }
        this.trayRoot.append(cards);
    }

    // Canvas pieces.

    protected buildBox(group: PanoramaGroup): HTMLElement {
        const box = document.createElement('div');
        box.className = `pb-org-box${group.isActive ? ' is-active' : ''}`;
        box.dataset.g = group.id;
        box.style.transform = `translate(${group.x}px, ${group.y}px)`;
        box.style.width = `${group.w}px`;
        box.style.height = `${group.h}px`;

        const header = document.createElement('div');
        header.className = 'pb-org-box-header';
        if (this.editingGroupId === group.id) {
            header.append(this.buildRename(group));
        } else {
            const title = document.createElement('span');
            title.className = 'pb-org-box-title';
            title.textContent = group.title;
            title.title = group.title;
            title.tabIndex = 0;
            title.addEventListener('dblclick', () => this.startRename(group.id));
            title.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    this.startRename(group.id);
                }
            });
            header.append(title);
        }
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'pb-org-box-close';
        close.dataset.command = PANORAMA_CLOSE_GROUP_COMMAND_ID;
        close.textContent = '×';
        close.title = 'Close group';
        close.setAttribute('aria-label', 'Close group');
        close.addEventListener('click', event => {
            event.stopPropagation();
            void this.closeGroupById(group.id);
        });
        header.append(close);
        header.addEventListener('pointerdown', event => this.beginBoxMove(event, group));
        header.addEventListener('click', () => {
            void this.activateGroup(group.id);
        });
        // Field-background click (anywhere in the box that is not a control)
        // marks the group active too; the close button and rename input stop
        // propagation, and card dives already activate, so this is idempotent.
        box.addEventListener('click', () => {
            void this.activateGroup(group.id);
        });
        box.append(header);

        const cards = document.createElement('div');
        cards.className = 'pb-org-box-cards';
        const tabs = this.model.getTabs(group.id);
        if (tabs.length === 0) {
            const hint = document.createElement('div');
            hint.className = 'pb-org-box-empty';
            hint.textContent = 'Empty group — drag tabs here.';
            cards.append(hint);
        }
        for (let i = 0; i < tabs.length; i += 1) {
            cards.append(this.buildCard(tabs[i], group.id, i === 0));
        }
        box.append(cards);

        const grip = document.createElement('div');
        grip.className = 'pb-org-box-resize';
        grip.setAttribute('aria-label', 'Resize group');
        grip.title = 'Resize group';
        grip.tabIndex = 0;
        grip.setAttribute('role', 'slider');
        grip.setAttribute('aria-valuemin', String(GROUP_BOX_MIN_W));
        grip.setAttribute('aria-valuenow', String(group.w));
        grip.setAttribute('aria-valuetext', `${group.w} by ${group.h} pixels`);
        grip.addEventListener('pointerdown', event => this.beginBoxResize(event, group));
        grip.addEventListener('keydown', event => this.stepBoxResize(event, group.id));
        box.append(grip);

        box.addEventListener('dragover', event => this.allowCardDrop(event, box));
        box.addEventListener('dragleave', () => box.classList.remove('is-drop-target'));
        box.addEventListener('drop', event => {
            box.classList.remove('is-drop-target');
            void this.dropCard(event, group.id);
        });
        return box;
    }

    protected buildCard(tab: PanoramaTab, groupId: string | null, tabbable = true): HTMLElement {
        const card = document.createElement('div');
        card.className = 'pb-org-card';
        card.dataset.u = tab.uri;
        card.draggable = true;
        card.tabIndex = tabbable ? 0 : -1;
        card.title = tab.title;
        if (tab.thumbnail) {
            const shot = document.createElement('img');
            shot.className = 'pb-org-card-thumb';
            shot.alt = '';
            shot.draggable = false;
            shot.addEventListener('error', () => shot.remove());
            shot.src = tab.thumbnail;
            card.append(shot);
        }
        const title = document.createElement('div');
        title.className = 'pb-org-card-title';
        title.textContent = tab.title;
        title.title = tab.title;
        const uri = document.createElement('div');
        uri.className = 'pb-org-card-uri';
        uri.textContent = tab.url || tab.uri;
        uri.title = tab.url || tab.uri;
        card.append(title, uri);
        card.addEventListener('click', () => this.dive(tab, groupId));
        card.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                this.dive(tab, groupId);
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                this.moveCardFocus(card, 1);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                this.moveCardFocus(card, -1);
            }
        });
        card.addEventListener('dragstart', event => {
            this.dragCard = { uri: tab.uri, fromGroup: groupId };
            card.classList.add('is-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tab.uri);
            }
        });
        card.addEventListener('dragend', () => {
            this.dragCard = undefined;
            card.classList.remove('is-dragging');
            this.clearDropTargets();
        });
        card.addEventListener('dragover', event => {
            event.stopPropagation();
            this.allowCardDrop(event, card);
        });
        card.addEventListener('dragleave', () => card.classList.remove('is-drop-target'));
        card.addEventListener('drop', event => {
            card.classList.remove('is-drop-target');
            void this.dropCardOntoCard(event, tab.uri, groupId);
        });
        return card;
    }

    /**
     * Tree sections render through the widget-owned tree module over the
     * single GroupModel: the widget supplies the data plus its own
     * callbacks, so the tree holds no fetch and no selection of its own.
     * Flipping the toggle never reloads and never loses selection.
     */
    protected buildSection(group: PanoramaGroup): HTMLElement {
        return buildTreeSection(group, this.model.getTabs(group.id), {
            renderTitle: target => this.editingGroupId === target.id
                ? this.buildRename(target)
                : this.buildTreeTitle(target),
            closeCommandId: PANORAMA_CLOSE_GROUP_COMMAND_ID,
            activateGroup: id => {
                void this.activateGroup(id);
            },
            closeGroup: id => {
                void this.closeGroupById(id);
            },
            dive: (tab, groupId) => this.dive(tab, groupId),
        });
    }

    /** Tree group title: identical rename entry to the canvas box title. */
    protected buildTreeTitle(group: PanoramaGroup): HTMLElement {
        const title = document.createElement('span');
        title.className = 'pb-org-tree-title';
        title.textContent = group.title;
        title.title = group.title;
        title.tabIndex = 0;
        title.addEventListener('dblclick', () => this.startRename(group.id));
        title.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                this.startRename(group.id);
            }
        });
        return title;
    }

    protected buildEmpty(heading: string, body: string, withAction: boolean): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'pb-org-empty';
        const title = document.createElement('div');
        title.className = 'pb-org-empty-heading';
        title.textContent = heading;
        const text = document.createElement('div');
        text.className = 'pb-org-empty-body';
        text.textContent = body;
        wrap.append(title, text);
        if (withAction) {
            const action = document.createElement('button');
            action.type = 'button';
            action.className = 'pb-org-empty-action theia-button';
            action.textContent = 'New Group';
            action.addEventListener('click', () => {
                void this.createNewGroup();
            });
            wrap.append(action);
        }
        return wrap;
    }

    protected buildRename(group: PanoramaGroup): HTMLElement {
        const input = document.createElement('input');
        input.className = 'pb-org-rename';
        input.type = 'text';
        input.value = group.title;
        input.maxLength = 60;
        input.placeholder = 'Group name';
        input.setAttribute('aria-label', 'Group name');
        // Pasted overflow is cut at the cap before commit (maxLength already
        // truncates typed and pasted text natively; this covers the rest).
        input.addEventListener('input', () => {
            if (input.value.length > GROUP_TITLE_MAX_CHARS) {
                input.value = input.value.slice(0, GROUP_TITLE_MAX_CHARS);
            }
        });
        let settled = false;
        const commit = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            this.editingGroupId = undefined;
            void this.model.commitTitle(this.actor, group.id, input.value).catch(error => {
                console.error('[@powerbrowser/modes] group rename failed:', error);
            }).finally(() => this.render());
        };
        const cancel = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            this.editingGroupId = undefined;
            this.render();
        };
        input.addEventListener('keydown', event => {
            event.stopPropagation();
            if (event.key === 'Enter') {
                commit();
            } else if (event.key === 'Escape') {
                cancel();
            }
        });
        input.addEventListener('blur', commit);
        input.addEventListener('pointerdown', event => event.stopPropagation());
        input.addEventListener('click', event => event.stopPropagation());
        return input;
    }

    // Gestures.

    protected beginBoxMove(event: PointerEvent, group: PanoramaGroup): void {
        if (event.button !== 0 || this.editingGroupId !== undefined) {
            return;
        }
        const target = event.target as HTMLElement | null;
        if (target && (target.closest('button') || target.closest('input') || target.closest('.pb-org-box-resize'))) {
            return;
        }
        event.preventDefault();
        const header = event.currentTarget as HTMLElement;
        try {
            header.setPointerCapture(event.pointerId);
        } catch {
            return;
        }
        this.suppressRender = true;
        const seq = this.geometrySeq;
        const base = { x: group.x, y: group.y };
        this.moveState = { id: group.id, startX: event.clientX, startY: event.clientY, baseX: group.x, baseY: group.y };
        const box = header.closest('.pb-org-box') as HTMLElement | null;
        const onMove = (move: PointerEvent): void => {
            if (!this.moveState) {
                return;
            }
            const x = Math.max(0, Math.floor(this.moveState.baseX + (move.clientX - this.moveState.startX)));
            const y = Math.max(0, Math.floor(this.moveState.baseY + (move.clientY - this.moveState.startY)));
            if (box) {
                box.style.transform = `translate(${x}px, ${y}px)`;
            }
            void this.debouncedMove(this.moveState.id, x, y, seq).catch(error => {
                console.error('[@powerbrowser/modes] group move failed:', error);
                this.suppressRender = false;
                this.moveState = undefined;
                this.render();
            });
        };
        const finish = (): void => {
            header.removeEventListener('pointermove', onMove);
            header.removeEventListener('pointerup', onUp);
            header.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
        };
        const onUp = (up: PointerEvent): void => {
            finish();
            if (!this.moveState) {
                return;
            }
            const { id, baseX, baseY } = this.moveState;
            const x = Math.max(0, Math.floor(baseX + (up.clientX - this.moveState.startX)));
            const y = Math.max(0, Math.floor(baseY + (up.clientY - this.moveState.startY)));
            this.moveState = undefined;
            this.suppressRender = false;
            void this.persistMove(id, x, y, seq).catch(error => {
                console.error('[@powerbrowser/modes] group move failed:', error);
            }).finally(() => {
                this.geometrySeq += 1;
                this.render();
            });
        };
        const onCancel = (): void => {
            finish();
            this.moveState = undefined;
            this.suppressRender = false;
            this.geometrySeq += 1;
            this.render();
        };
        const onKey = (key: KeyboardEvent): void => {
            if (key.key === 'Escape') {
                // Esc cancels: invalidate the trailing debounce, revert the
                // paint, and restore persisted bounds to base -- nothing new
                // stays moved or persisted.
                finish();
                this.geometrySeq += 1;
                const id = this.moveState?.id;
                this.moveState = undefined;
                this.suppressRender = false;
                this.render();
                if (id) {
                    void this.model.moveGroup(this.actor, id, base.x, base.y).catch(error => {
                        console.error('[@powerbrowser/modes] group move cancel-restore failed:', error);
                    }).finally(() => this.render());
                }
            }
        };
        header.addEventListener('pointermove', onMove);
        header.addEventListener('pointerup', onUp);
        header.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
    }

    protected beginBoxResize(event: PointerEvent, group: PanoramaGroup): void {
        if (event.button !== 0 || this.editingGroupId !== undefined) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const grip = event.currentTarget as HTMLElement;
        try {
            grip.setPointerCapture(event.pointerId);
        } catch {
            return;
        }
        this.suppressRender = true;
        const seq = this.geometrySeq;
        const base = { w: group.w, h: group.h };
        this.resizeState = { id: group.id, startX: event.clientX, startY: event.clientY, baseW: group.w, baseH: group.h };
        const box = grip.closest('.pb-org-box') as HTMLElement | null;
        const apply = (clientX: number, clientY: number): { w: number; h: number } => {
            const state = this.resizeState;
            const w = Math.max(GROUP_BOX_MIN_W, Math.floor((state?.baseW ?? base.w) + (clientX - (state?.startX ?? clientX))));
            const h = Math.max(GROUP_BOX_MIN_H, Math.floor((state?.baseH ?? base.h) + (clientY - (state?.startY ?? clientY))));
            if (box) {
                box.style.width = `${w}px`;
                box.style.height = `${h}px`;
            }
            return { w, h };
        };
        const finish = (): void => {
            grip.removeEventListener('pointermove', onMove);
            grip.removeEventListener('pointerup', onUp);
            grip.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
        };
        const onMove = (move: PointerEvent): void => {
            if (!this.resizeState) {
                return;
            }
            const { w, h } = apply(move.clientX, move.clientY);
            void this.debouncedResize(this.resizeState.id, w, h, seq).catch(error => {
                console.error('[@powerbrowser/modes] group resize failed:', error);
                this.suppressRender = false;
                this.resizeState = undefined;
                this.render();
            });
        };
        const onUp = (up: PointerEvent): void => {
            finish();
            if (!this.resizeState) {
                return;
            }
            const { id } = this.resizeState;
            const { w, h } = apply(up.clientX, up.clientY);
            this.resizeState = undefined;
            this.suppressRender = false;
            void this.persistResize(id, w, h, seq).catch(error => {
                console.error('[@powerbrowser/modes] group resize failed:', error);
            }).finally(() => {
                this.geometrySeq += 1;
                this.render();
            });
        };
        const onCancel = (): void => {
            finish();
            this.resizeState = undefined;
            this.suppressRender = false;
            this.geometrySeq += 1;
            this.render();
        };
        const onKey = (key: KeyboardEvent): void => {
            if (key.key === 'Escape') {
                finish();
                this.geometrySeq += 1;
                const id = this.resizeState?.id;
                this.resizeState = undefined;
                this.suppressRender = false;
                this.render();
                if (id) {
                    void this.model.resizeGroup(this.actor, id, base.w, base.h).catch(error => {
                        console.error('[@powerbrowser/modes] group resize cancel-restore failed:', error);
                    }).finally(() => this.render());
                }
            }
        };
        grip.addEventListener('pointermove', onMove);
        grip.addEventListener('pointerup', onUp);
        grip.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
    }

    protected async persistMove(id: string, x: number, y: number, seq: number): Promise<void> {
        if (seq !== this.geometrySeq) {
            return;
        }
        try {
            await this.model.moveGroup(this.actor, id, x, y);
        } catch (error) {
            this.render();
            throw error;
        }
    }

    protected async persistResize(id: string, w: number, h: number, seq: number): Promise<void> {
        if (seq !== this.geometrySeq) {
            return;
        }
        try {
            await this.model.resizeGroup(this.actor, id, w, h);
        } catch (error) {
            this.render();
            throw error;
        }
    }

    /**
     * Keyboard resize (15-UI-REVIEW Top Fix #2): arrows step the box
     * through the same persistResize path as the pointer grip -- 8px, 32px
     * with Shift; Left/Right ride width, Up/Down ride height, floored at
     * the contracted minimum. The model change re-renders (fresh grip
     * carries fresh valuenow/valuetext), so focus is returned to the new
     * grip; a clamped no-op changes nothing and keeps focus where it is.
     */
    protected stepBoxResize(event: KeyboardEvent, id: string): void {
        const step = event.shiftKey ? 32 : 8;
        let dw = 0;
        let dh = 0;
        if (event.key === 'ArrowLeft') {
            dw = -step;
        } else if (event.key === 'ArrowRight') {
            dw = step;
        } else if (event.key === 'ArrowUp') {
            dh = -step;
        } else if (event.key === 'ArrowDown') {
            dh = step;
        } else {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const current = this.model.listGroups().find(candidate => candidate.id === id);
        if (!current) {
            return;
        }
        const w = Math.max(GROUP_BOX_MIN_W, current.w + dw);
        const h = Math.max(GROUP_BOX_MIN_H, current.h + dh);
        if (w === current.w && h === current.h) {
            return;
        }
        void this.persistResize(id, w, h, this.geometrySeq).then(() => {
            const grip = this.node.querySelector(`[data-g="${CSS.escape(id)}"] .pb-org-box-resize`) as HTMLElement | null;
            if (grip) {
                grip.focus();
            }
        }).catch(error => {
            console.error('[@powerbrowser/modes] group resize failed:', error);
        });
    }

    protected allowCardDrop(event: DragEvent, host: HTMLElement): void {
        if (!this.dragCard) {
            return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        host.classList.add('is-drop-target');
    }

    protected clearDropTargets(): void {
        for (const marked of Array.from(this.node.querySelectorAll('.is-drop-target'))) {
            marked.classList.remove('is-drop-target');
        }
    }

    protected async dropCard(event: DragEvent, toGroup: string | null): Promise<void> {
        event.preventDefault();
        const drag = this.dragCard;
        this.dragCard = undefined;
        this.clearDropTargets();
        if (!drag) {
            return;
        }
        try {
            await this.model.moveCard(this.actor, drag.uri, toGroup);
            await this.dissolveEmptied(drag.fromGroup, toGroup);
        } catch (error) {
            console.error('[@powerbrowser/modes] card drop failed:', error);
        }
        this.render();
    }

    /**
     * Card-onto-card: auto-draws one box containing both cards at the drop
     * point, then dissolves any source box left empty (last-card-out) --
     * BOTH sources, not just the drag source (WR-03: a cross-group drop
     * onto a sole card in B emptied B without dissolving it).
     */
    protected async dropCardOntoCard(event: DragEvent, targetUri: string, targetGroup: string | null): Promise<void> {
        event.preventDefault();
        event.stopPropagation();
        const drag = this.dragCard;
        this.dragCard = undefined;
        this.clearDropTargets();
        if (!drag || drag.uri === targetUri) {
            return;
        }
        try {
            const box = await this.model.autoBox(this.actor, [drag.uri, targetUri], this.canvasPoint(event));
            if (box) {
                if (drag.fromGroup !== null && drag.fromGroup !== box.id) {
                    await this.dissolveEmptied(drag.fromGroup, box.id);
                }
                if (targetGroup !== null && targetGroup !== box.id && targetGroup !== drag.fromGroup) {
                    await this.dissolveEmptied(targetGroup, box.id);
                }
            }
        } catch (error) {
            console.error('[@powerbrowser/modes] card auto-box failed:', error);
        }
        this.render();
    }

    /** Card-onto-field: auto-draws one box around the dropped card. */
    protected async dropCardOnField(event: DragEvent): Promise<void> {
        const target = event.target as HTMLElement | null;
        if (target && target.closest('.pb-org-box, .pb-org-card')) {
            return;
        }
        event.preventDefault();
        const drag = this.dragCard;
        this.dragCard = undefined;
        this.clearDropTargets();
        if (!drag) {
            return;
        }
        try {
            const box = await this.model.autoBox(this.actor, [drag.uri], this.canvasPoint(event));
            if (box && drag.fromGroup !== null && drag.fromGroup !== box.id) {
                await this.dissolveEmptied(drag.fromGroup, box.id);
            }
        } catch (error) {
            console.error('[@powerbrowser/modes] card auto-box failed:', error);
        }
        this.render();
    }

    /** Last-card-out: dissolves a source box left with zero cards. */
    protected async dissolveEmptied(fromGroup: string | null, toGroup: string | null): Promise<void> {
        if (fromGroup === null || fromGroup === toGroup
            || this.model.getTabs(fromGroup).length !== 0
            || !this.model.listGroups().some(group => group.id === fromGroup)) {
            return;
        }
        await this.model.dissolveGroup(this.actor, fromGroup);
    }

    /**
     * Drop-event client pixels into user-pixel canvas coordinates. The zoom
     * transform touches the layer only, so dividing the layer-relative point
     * by the zoom factor recovers the stored bounds space.
     */
    protected canvasPoint(event: DragEvent): { x: number; y: number } {
        const zoom = ZOOM_STEPS[this.zoomIndex] / 100;
        try {
            const rect = this.canvasRoot.getBoundingClientRect();
            return {
                x: Math.max(0, Math.floor((event.clientX - rect.left) / zoom)),
                y: Math.max(0, Math.floor((event.clientY - rect.top) / zoom)),
            };
        } catch {
            return { x: 24, y: 24 };
        }
    }

    /**
     * Roving tabindex within one box or the tray: arrows move focus to the
     * sibling card, which takes the single tab stop. Enter still dives.
     */
    protected moveCardFocus(card: HTMLElement, delta: 1 | -1): void {
        const scope = card.closest('.pb-org-box-cards, .pb-org-tray-cards');
        if (!scope) {
            return;
        }
        const cards = Array.from(scope.querySelectorAll('.pb-org-card')) as HTMLElement[];
        const at = cards.indexOf(card);
        if (at < 0 || cards.length < 2) {
            return;
        }
        const next = cards[(at + delta + cards.length) % cards.length];
        for (const candidate of cards) {
            candidate.tabIndex = candidate === next ? 0 : -1;
        }
        next.focus();
    }

    protected dive(tab: PanoramaTab, groupId: string | null): void {
        if (groupId !== null) {
            void this.activateGroup(groupId);
        }
        // GUI-01 candidate A: the sanctioned frontend-to-chrome crossing for
        // opening a stock window -- one-way, no ack, proven nav-only.
        window.open(tab.url || tab.uri, '_blank');
    }

    protected async activateGroup(id: string): Promise<void> {
        try {
            await this.model.setActiveGroup(this.actor, id);
        } catch (error) {
            console.error('[@powerbrowser/modes] set-active-group failed:', error);
            this.render();
        }
    }

    protected startRename(id: string): void {
        this.editingGroupId = id;
        this.render();
        this.focusRename(id);
    }

    protected focusRename(id: string): void {
        const input = this.node.querySelector(`[data-g="${CSS.escape(id)}"] .pb-org-rename`) as HTMLInputElement | null;
        if (input) {
            input.focus();
            input.select();
        }
    }

    protected async flash(text: string): Promise<void> {
        const id = 'powerbrowser.modes.panorama-notice';
        try {
            await this.statusBar.setElement(id, { text, alignment: StatusBarAlignment.RIGHT });
        } catch {
            return;
        }
        window.setTimeout(() => {
            void this.statusBar.removeElement(id).catch(() => undefined);
        }, 4000);
    }

    // Static DOM (built once; roots re-render over the model).

    protected buildStaticDom(): void {
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'pb-org-toolbar';

        const toggle = document.createElement('div');
        toggle.className = 'pb-org-toggle';
        toggle.setAttribute('role', 'group');
        this.canvasToggle = document.createElement('button');
        this.canvasToggle.type = 'button';
        this.canvasToggle.className = 'pb-org-toggle-segment';
        this.canvasToggle.textContent = 'Canvas';
        this.canvasToggle.addEventListener('click', () => this.showCanvasView());
        this.treeToggle = document.createElement('button');
        this.treeToggle.type = 'button';
        this.treeToggle.className = 'pb-org-toggle-segment';
        this.treeToggle.textContent = 'Tree';
        this.treeToggle.addEventListener('click', () => this.showTreeView());
        toggle.append(this.canvasToggle, this.treeToggle);

        const fresh = document.createElement('button');
        fresh.type = 'button';
        fresh.className = 'pb-org-new theia-button';
        fresh.textContent = 'New Group';
        fresh.dataset.command = PANORAMA_NEW_GROUP_COMMAND_ID;
        fresh.addEventListener('click', () => {
            void this.createNewGroup();
        });

        this.zoomCluster = document.createElement('div');
        this.zoomCluster.className = 'pb-org-zoom';
        const zoomOut = document.createElement('button');
        zoomOut.type = 'button';
        zoomOut.className = 'pb-org-zoom-step';
        zoomOut.textContent = '−';
        zoomOut.title = 'Zoom out';
        zoomOut.setAttribute('aria-label', 'Zoom out');
        zoomOut.addEventListener('click', () => this.stepZoom(-1));
        this.zoomReadout = document.createElement('span');
        this.zoomReadout.className = 'pb-org-zoom-readout';
        const zoomIn = document.createElement('button');
        zoomIn.type = 'button';
        zoomIn.className = 'pb-org-zoom-step';
        zoomIn.textContent = '+';
        zoomIn.title = 'Zoom in';
        zoomIn.setAttribute('aria-label', 'Zoom in');
        zoomIn.addEventListener('click', () => this.stepZoom(1));
        const zoomReset = document.createElement('button');
        zoomReset.type = 'button';
        zoomReset.className = 'pb-org-zoom-step';
        zoomReset.textContent = '100%';
        zoomReset.title = 'Reset zoom';
        zoomReset.setAttribute('aria-label', 'Reset zoom');
        zoomReset.addEventListener('click', () => {
            this.zoomIndex = DEFAULT_ZOOM_INDEX;
            this.render();
        });
        this.zoomCluster.append(zoomOut, this.zoomReadout, zoomIn, zoomReset);
        this.toolbar.append(toggle, fresh, this.zoomCluster);

        this.loadBar = this.buildBar(
            'Power Browser couldn\u2019t load your tab groups. Your tabs are unchanged \u2014 choose Retry.',
            () => {
                void this.initialize();
            }
        );
        this.saveBar = this.buildBar(
            'Power Browser couldn\u2019t save your tab groups. The canvas shows your latest arrangement \u2014 choose Retry.',
            () => {
                void this.retrySave();
            }
        );

        this.canvasHost = document.createElement('div');
        this.canvasHost.className = 'pb-org-canvas-host';
        this.canvasLayer = document.createElement('div');
        this.canvasLayer.className = 'pb-org-canvas-layer';
        this.canvasRoot = document.createElement('div');
        this.canvasRoot.className = 'pb-org-canvas';
        this.canvasRoot.dataset.canvas = 'true';
        this.canvasRoot.addEventListener('dragover', event => {
            const target = event.target as HTMLElement | null;
            if (target && target.closest('.pb-org-box, .pb-org-card')) {
                return;
            }
            this.allowCardDrop(event, this.canvasRoot);
        });
        this.canvasRoot.addEventListener('dragleave', () => this.canvasRoot.classList.remove('is-drop-target'));
        this.canvasRoot.addEventListener('drop', event => {
            this.canvasRoot.classList.remove('is-drop-target');
            void this.dropCardOnField(event);
        });
        this.canvasLayer.append(this.canvasRoot);
        this.canvasHost.append(this.canvasLayer);

        this.treeRoot = document.createElement('div');
        this.treeRoot.className = 'pb-org-tree';
        this.treeRoot.dataset.tree = 'true';

        this.trayRoot = document.createElement('div');
        this.trayRoot.className = 'pb-org-tray';
        this.trayRoot.dataset.tray = 'true';
        this.trayRoot.addEventListener('dragover', event => this.allowCardDrop(event, this.trayRoot));
        this.trayRoot.addEventListener('dragleave', () => this.trayRoot.classList.remove('is-drop-target'));
        this.trayRoot.addEventListener('drop', event => {
            this.trayRoot.classList.remove('is-drop-target');
            void this.dropCard(event, null);
        });

        this.node.append(this.toolbar, this.loadBar, this.saveBar, this.canvasHost, this.treeRoot, this.trayRoot);
    }

    protected buildBar(text: string, onRetry: () => void): HTMLElement {
        const bar = document.createElement('div');
        bar.className = 'pb-org-errorbar';
        bar.hidden = true;
        const copy = document.createElement('span');
        copy.className = 'pb-org-errorbar-text';
        copy.textContent = text;
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'pb-org-errorbar-retry theia-button';
        retry.textContent = 'Retry';
        retry.addEventListener('click', onRetry);
        bar.append(copy, retry);
        return bar;
    }

    protected stepZoom(direction: 1 | -1): void {
        this.zoomIndex = Math.min(ZOOM_STEPS.length - 1, Math.max(0, this.zoomIndex + direction));
        this.render();
    }
}

@injectable()
export class OrganisingContribution extends AbstractViewContribution<OrganisingWidget> {
    constructor() {
        super({
            widgetId: OrganisingWidget.ID,
            widgetName: 'Organising',
            defaultWidgetOptions: { area: 'main' },
        });
    }

    onStart(): void {
        registerOrganisingSlot({
            open: () => {
                void this.openView({ activate: false, reveal: true });
            },
            close: () => {
                void this.closeView();
            },
        });
    }
}

@injectable()
export class OrganisingCommandHandler implements PanoramaCommandHandler {
    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    protected widget(): OrganisingWidget | undefined {
        const found = this.shell.getWidgetById(OrganisingWidget.ID);
        return found instanceof OrganisingWidget ? found : undefined;
    }

    async newGroup(): Promise<void> {
        await this.widget()?.createNewGroup();
    }

    async closeGroup(id: string): Promise<void> {
        if (id) {
            await this.widget()?.closeGroupById(id);
        }
    }

    showCanvas(): void {
        this.widget()?.showCanvasView();
    }

    showTree(): void {
        this.widget()?.showTreeView();
    }

    async retrySave(): Promise<void> {
        await this.widget()?.retrySave();
    }
}
