/**
 * GUI-08 (15-03): tree render functions OWNED by the organising widget.
 *
 * One file-owning widget: the toggle flips visibility only, so both render
 * roots read the single GroupModel through the widget. This file therefore
 * holds NO fetch, NO cache, and NO model query of its own -- groups and
 * membership arrive as arguments from the widget, which is the single reader.
 * A query call site here is the defect this structure prevents (the parity
 * gate asserts it statically).
 *
 * Same affordances as canvas: active marker plus title 600 (via the shared
 * is-active class), double-click rename through the widget's identical rules,
 * header close with the identical confirmation, and the contracted
 * empty-group hint. NO thumbnails in tree -- that is the canvas's job, not a
 * missing state. Names render as textContent, never innerHTML.
 */

import type { PanoramaGroup, PanoramaTab } from './group-model';

/**
 * Callbacks the owning widget supplies per render. The tree keeps no state:
 * selection (active group, New Group draft) lives on the widget, so a flip
 * never loses it.
 */
export interface TreeSectionHooks {
    /** Title element built by the widget: rename input while editing, else the title span. Identical rules to canvas. */
    renderTitle(group: PanoramaGroup): HTMLElement;
    /** Imported command const for the header close button (never a re-spelled string). */
    closeCommandId: string;
    activateGroup(id: string): void;
    closeGroup(id: string): void;
    dive(tab: PanoramaTab, groupId: string): void;
}

/** One group section: header (title plus exact tab count plus close) over stacked tab rows. */
export function buildTreeSection(
    group: PanoramaGroup,
    tabs: readonly PanoramaTab[],
    hooks: TreeSectionHooks,
): HTMLElement {
    const section = document.createElement('div');
    section.className = `pb-org-tree-section${group.isActive ? ' is-active' : ''}`;
    section.dataset.g = group.id;
    const header = document.createElement('div');
    header.className = 'pb-org-tree-header';
    header.append(hooks.renderTitle(group));
    const count = document.createElement('span');
    count.className = 'pb-org-tree-count';
    count.textContent = `${tabs.length}`;
    header.append(count);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'pb-org-tree-close';
    close.dataset.command = hooks.closeCommandId;
    close.textContent = '×';
    close.title = 'Close group';
    close.setAttribute('aria-label', 'Close group');
    close.addEventListener('click', event => {
        event.stopPropagation();
        hooks.closeGroup(group.id);
    });
    header.append(close);
    header.addEventListener('click', () => {
        hooks.activateGroup(group.id);
    });
    section.append(header);
    if (tabs.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'pb-org-box-empty';
        hint.textContent = 'Empty group — drag tabs here.';
        section.append(hint);
    }
    for (const tab of tabs) {
        section.append(buildTreeRow(tab, group.id, hooks));
    }
    return section;
}

/** One stacked tab row: title 13px plus mono URI caption 12px, text only. */
export function buildTreeRow(
    tab: PanoramaTab,
    groupId: string,
    hooks: Pick<TreeSectionHooks, 'dive'>,
): HTMLElement {
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
    row.addEventListener('click', () => hooks.dive(tab, groupId));
    row.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            hooks.dive(tab, groupId);
        }
    });
    return row;
}
