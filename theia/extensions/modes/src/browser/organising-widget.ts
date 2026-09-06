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
import { GroupModel, PanoramaGroup, PanoramaTab } from './group-model';
import { PanoramaCommandHandler } from './panorama-commands';
import '../../src/browser/modes.css';

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
    protected dragCard: { uri: string; fromGroup: string | null } | undefined;

    protected readonly debouncedMove = pDebounce((id: string, x: number, y: number) => this.persistMove(id, x, y), 150);

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
        let confirmed: boolean | undefined = false;
        try {
            confirmed = await new ConfirmDialog({
                title: 'Close Group',
                msg: `Close "${group.title}"? Its ${count} tab(s) will close too. You can't undo this.`,
                ok: 'Close Group',
                cancel: 'Cancel',
            }).open();
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
        for (const tab of tabs) {
            cards.append(this.buildCard(tab, null));
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
        for (const tab of tabs) {
            cards.append(this.buildCard(tab, group.id));
        }
        box.append(cards);

        box.addEventListener('dragover', event => this.allowCardDrop(event, box));
        box.addEventListener('dragleave', () => box.classList.remove('is-drop-target'));
        box.addEventListener('drop', event => {
            box.classList.remove('is-drop-target');
            void this.dropCard(event, group.id);
        });
        return box;
    }

    protected buildCard(tab: PanoramaTab, groupId: string | null): HTMLElement {
        const card = document.createElement('div');
        card.className = 'pb-org-card';
        card.dataset.u = tab.uri;
        card.draggable = true;
        card.tabIndex = 0;
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
            }
        });
        card.addEventListener('dragstart', event => {
            this.dragCard = { uri: tab.uri, fromGroup: groupId };
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tab.uri);
            }
        });
        card.addEventListener('dragend', () => {
            this.dragCard = undefined;
            this.clearDropTargets();
        });
        return card;
    }

    protected buildSection(group: PanoramaGroup): HTMLElement {
        const tabs = this.model.getTabs(group.id);
        const section = document.createElement('div');
        section.className = `pb-org-tree-section${group.isActive ? ' is-active' : ''}`;
        section.dataset.g = group.id;
        const header = document.createElement('div');
        header.className = 'pb-org-tree-header';
        if (this.editingGroupId === group.id) {
            header.append(this.buildRename(group));
        } else {
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
            header.append(title);
        }
        const count = document.createElement('span');
        count.className = 'pb-org-tree-count';
        count.textContent = `${tabs.length}`;
        header.append(count);
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'pb-org-tree-close';
        close.textContent = '×';
        close.title = 'Close group';
        close.setAttribute('aria-label', 'Close group');
        close.addEventListener('click', event => {
            event.stopPropagation();
            void this.closeGroupById(group.id);
        });
        header.append(close);
        header.addEventListener('click', () => {
            void this.activateGroup(group.id);
        });
        section.append(header);
        if (tabs.length === 0) {
            const hint = document.createElement('div');
            hint.className = 'pb-org-box-empty';
            hint.textContent = 'Empty group — drag tabs here.';
            section.append(hint);
        }
        for (const tab of tabs) {
            const row = document.createElement('div');
            row.className = 'pb-org-tree-row';
            row.dataset.u = tab.uri;
            row.tabIndex = 0;
            row.title = tab.title;
            const name = document.createElement('span');
            name.className = 'pb-org-tree-row-title';
            name.textContent = tab.title;
            name.title = tab.title;
            const uri = document.createElement('span');
            uri.className = 'pb-org-tree-row-uri';
            uri.textContent = tab.url || tab.uri;
            uri.title = tab.url || tab.uri;
            row.append(name, uri);
            row.addEventListener('click', () => this.dive(tab, group.id));
            row.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    this.dive(tab, group.id);
                }
            });
            section.append(row);
        }
        return section;
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
        if (target && (target.closest('button') || target.closest('input'))) {
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
            void this.debouncedMove(this.moveState.id, x, y).catch(error => {
                console.error('[@powerbrowser/modes] group move failed:', error);
                this.suppressRender = false;
                this.moveState = undefined;
                this.render();
            });
        };
        const onUp = (up: PointerEvent): void => {
            header.removeEventListener('pointermove', onMove);
            header.removeEventListener('pointerup', onUp);
            header.removeEventListener('pointercancel', onCancel);
            if (!this.moveState) {
                return;
            }
            const { id, baseX, baseY } = this.moveState;
            const x = Math.max(0, Math.floor(baseX + (up.clientX - this.moveState.startX)));
            const y = Math.max(0, Math.floor(baseY + (up.clientY - this.moveState.startY)));
            this.moveState = undefined;
            this.suppressRender = false;
            void this.persistMove(id, x, y).catch(error => {
                console.error('[@powerbrowser/modes] group move failed:', error);
            }).finally(() => this.render());
        };
        const onCancel = (): void => {
            header.removeEventListener('pointermove', onMove);
            header.removeEventListener('pointerup', onUp);
            header.removeEventListener('pointercancel', onCancel);
            this.moveState = undefined;
            this.suppressRender = false;
            this.render();
        };
        header.addEventListener('pointermove', onMove);
        header.addEventListener('pointerup', onUp);
        header.addEventListener('pointercancel', onCancel);
    }

    protected async persistMove(id: string, x: number, y: number): Promise<void> {
        try {
            await this.model.moveGroup(this.actor, id, x, y);
        } catch (error) {
            this.render();
            throw error;
        }
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
            if (drag.fromGroup !== null && drag.fromGroup !== toGroup
                && this.model.getTabs(drag.fromGroup).length === 0
                && this.model.listGroups().some(group => group.id === drag.fromGroup)) {
                await this.model.dissolveGroup(this.actor, drag.fromGroup);
            }
        } catch (error) {
            console.error('[@powerbrowser/modes] card drop failed:', error);
        }
        this.render();
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
        const input = this.node.querySelector(`[data-g="${id}"] .pb-org-rename`) as HTMLInputElement | null;
        if (input) {
            input.focus();
            input.select();
        }
    }

    protected async flash(text: string): Promise<void> {
        const id = 'powerbrowser.panorama.notice';
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
