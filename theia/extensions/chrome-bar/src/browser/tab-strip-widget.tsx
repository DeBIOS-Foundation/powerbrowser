import * as React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, ReactWidget, Widget } from '@theia/core/lib/browser';
import { DisposableCollection } from '@theia/core/lib/common/disposable';

/**
 * GUI-07: the tab strip's Browsing home — the very top of the window, above
 * the URL row, where Firefox and Chrome put it (14-UI-SPEC per-mode shell map,
 * amended 2026-09-08; sketch 003).
 *
 * ## Why this is a second view and not the strip itself moved
 *
 * The stock strip is a Lumino `TabBar` owned by the main `DockPanel`. It is
 * `position: absolute` with left/top/width the dock's layout recomputes on
 * every pass (measured live: `top: 0; left: 0; width: 1609px; height: 35px`
 * inside `#theia-main-content-panel`). Reparenting that node into the top
 * panel does not move a widget between shell areas the way 13-01's spike
 * moved a content widget — it hands one node to two layouts, and the dock
 * wins every pass. So the top-panel home renders the same model instead, and
 * the dock's own bar is hidden while this one is showing.
 *
 * That hiding is Lumino's own supported path, not surgery: `DockPanel` hides
 * generated tab bars itself in `single-document` mode, and the layout
 * accounts for a hidden bar. Measured live: with the dock's bar hidden the
 * current content moved from y=107 to y=72 and returned on show, so the 35px
 * is genuinely reclaimed rather than left as a gap.
 *
 * ## Why it fits without resizing anything
 *
 * The top panel is pinned at 72px — `fit()` on the panel and on the shell
 * both leave it there. It does not need to change: in Browsing the menubar
 * (30px) hides, the box layout reflows the URL row to y=0, and the freed
 * space at the bottom is where this strip goes. `[strip][URL row]` occupies
 * the same 72px `[menubar][URL row]` did.
 *
 * ## What this is NOT
 *
 * Not the unified chrome+Theia tab strip. That is GUI-04, it is a later
 * milestone by CLAUDE.md hard rule 3, and it requires the chrome-owned tab
 * model in `@powerbrowser/browser-bridge`. This widget reads Theia's main
 * dock and nothing else; it adds no tab model of its own, so it cannot
 * become a second source of truth that the bridge would later have to
 * reconcile.
 */
@injectable()
export class TabStripWidget extends ReactWidget {

    static readonly ID = 'powerbrowser.tab-strip';

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    protected readonly toDispose = new DisposableCollection();

    @postConstruct()
    protected init(): void {
        this.id = TabStripWidget.ID;
        this.addClass('pb-tab-strip');
        // Hidden until a mode asks for it. Browsing is the launch default, so
        // the mode service shows it on the launch switch like any other.
        this.setHidden(true);
        // Every shell event that can change WHICH tabs exist or which one is
        // current. The dock's own tab bar redraws itself on these; this view
        // has to be told.
        this.toDispose.pushAll([
            this.shell.onDidAddWidget(() => this.update()),
            this.shell.onDidRemoveWidget(() => this.update()),
            this.shell.onDidChangeCurrentWidget(() => this.update()),
        ]);
        this.shell.mainPanel.onDidChangeCurrent(() => this.update());
        this.update();
    }

    override dispose(): void {
        this.toDispose.dispose();
        super.dispose();
    }

    /**
     * The main dock's widgets in dock order. Read on every render rather than
     * cached: the dock is the model, and a cached copy here would be the
     * second source of truth this widget exists to avoid.
     */
    protected mainTabs(): Widget[] {
        return [...this.shell.mainPanel.widgets()];
    }

    protected activateTab(widget: Widget): void {
        this.shell.activateWidget(widget.id);
    }

    protected closeTab(widget: Widget, event: React.MouseEvent): void {
        // Stop the click reaching the tab body, which would activate the tab
        // being closed and fight the dock's own removeBehavior.
        event.stopPropagation();
        void this.shell.closeWidget(widget.id);
    }

    protected render(): React.ReactNode {
        const current = this.shell.mainPanel.currentTitle?.owner;
        const tabs = this.mainTabs();
        return <div className='pb-tab-strip-row' role='tablist'>
            {tabs.map(widget => {
                const active = widget === current;
                const label = widget.title.label || widget.id;
                return <div
                    key={widget.id}
                    role='tab'
                    aria-selected={active}
                    title={label}
                    className={'pb-tab' + (active ? ' is-active' : '')}
                    onClick={() => this.activateTab(widget)}
                >
                    <span className='pb-tab-title'>{label}</span>
                    {widget.title.closable && <span
                        className='pb-tab-close'
                        role='button'
                        aria-label={`Close ${label}`}
                        onClick={event => this.closeTab(widget, event)}
                    >✕</span>}
                </div>;
            })}
        </div>;
    }
}
