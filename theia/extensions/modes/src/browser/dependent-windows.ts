import { injectable, inject } from '@theia/core/shared/inversify';
import { ApplicationShell, FrontendApplicationContribution, Widget, WidgetManager } from '@theia/core/lib/browser';
import { SecondaryWindowHandler, extractSecondaryWindow } from '@theia/core/lib/browser/secondary-window-handler';
import { SecondaryWindowService } from '@theia/core/lib/browser/window/secondary-window-service';
import { ExtractableWidget } from '@theia/core/lib/browser/widgets/extractable-widget';

/**
 * GUI-09 (14-03): dependent windows per the 14-PROBE verdict (GREEN).
 *
 * The probe proved the stock secondary-window handler hosts live terminal
 * and editor widgets in a real secondary frame with no stock-chrome
 * fallthrough, so this contribution drives
 * `moveWidgetToSecondaryWindow` and adds NO chrome-side opener: the two
 * chrome-side files stay byte-identical (no new patch, no new import, no
 * catalogue amendment). Setup snapshots (setups.json) record dependent
 * rects and hosted tab URIs for verbatim restore; this contribution owns
 * the window side of that contract (membership, loaded-time adjustments,
 * closed state, focus return).
 *
 * Membership (constrain-without-rebind, chat precedent inverted): exactly
 * the stock tab-content kinds stay extractable while IDE chrome is pinned
 * non-extractable at creation with pre-existing instances fixed, making a
 * second IDE frame structurally unreachable. The chrome bar carries the
 * mode toggle; side panels, the status bar, and the tab strip are shell
 * infrastructure rather than extractable widgets, so pinning the chrome
 * bar widget id closes the only frame-shaped hole.
 *
 * Timing: dependent adjustments land on window loaded, never on opened
 * (the document is still blank at opened). Closing a dependent returns
 * focus to the core window and destroys nothing; core-close kills the
 * session through the stock shutdown cascade with relaunch restoring via
 * the setups last-session applicator. The tab stays a core-model tab, so
 * the tabs invariant holds across windows. Blocked popups reuse the
 * existing throw path in the setups command (palette and activation
 * guidance) -- never a new dialog, and no custom window animation is
 * authored anywhere here.
 */

/**
 * IDE-frame widget ids pinned non-extractable. The ONE hand-kept set the
 * content gate derives at check time: widening it never happens by
 * accident (surplus pin still reported), narrowing it goes red.
 */
export const NON_EXTRACTABLE_WIDGET_IDS: ReadonlyArray<string> = Object.freeze([
    'powerbrowser.chrome-bar',
]);

/** Contracted dependent tab-closed heading (14-UI-SPEC.md, verbatim). */
export const DEPENDENT_TAB_CLOSED_HEADING = 'This tab is closed';

/** Contracted dependent tab-closed body (14-UI-SPEC.md, verbatim). */
export const DEPENDENT_TAB_CLOSED_BODY = 'The tab shown in this window was closed. Close this window to return to Power Browser.';

/** Contracted dependent tab-closed button (14-UI-SPEC.md, verbatim): window-only close. */
export const DEPENDENT_CLOSE_WINDOW_LABEL = 'Close Window';

@injectable()
export class DependentWindowsContribution implements FrontendApplicationContribution {

    @inject(WidgetManager)
    protected readonly widgets: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(SecondaryWindowHandler)
    protected readonly secondaryWindows: SecondaryWindowHandler;

    @inject(SecondaryWindowService)
    protected readonly secondaryService: SecondaryWindowService;

    onStart(): void {
        // Pre-existing instances first (a contribution whose onStart ran
        // earlier may already have created the chrome bar), then every
        // future creation -- the same two-ordering shape as the chat pin.
        for (const id of NON_EXTRACTABLE_WIDGET_IDS) {
            for (const widget of this.findWidgetsById(id)) {
                this.pinNonExtractable(widget);
            }
        }
        this.widgets.onDidCreateWidget(({ widget }) => {
            this.pinNonExtractable(widget);
        });
        // Loaded, never opened: at opened the document is still blank, so
        // the orphan check below would misfire on every open.
        this.secondaryService.onWindowLoaded(win => {
            this.renderClosedStateIfOrphaned(win);
        });
        // The hosted tab closed elsewhere while its window stands: render
        // the contracted closed state with its window-only close. Idempotent
        // (the probe observed double-closed variance): the marker skips
        // repeats, and an already-closed window needs nothing.
        this.secondaryWindows.onDidRemoveWidget(([widget, win]) => {
            void widget;
            this.renderClosedState(win);
        });
        // Closing a dependent returns focus to the core window and destroys
        // nothing: the widget already re-homed through the stock path.
        this.secondaryService.onWindowClosed(() => {
            try {
                window.focus();
            } catch {
                return;
            }
        });
    }

    protected pinNonExtractable(widget: unknown): void {
        if (widget instanceof Widget
            && NON_EXTRACTABLE_WIDGET_IDS.includes(widget.id)
            && ExtractableWidget.is(widget)) {
            widget.isExtractable = false;
        }
    }

    protected findWidgetsById(id: string): Widget[] {
        try {
            const widget = this.shell.getWidgetById(id);
            return widget ? [widget] : [];
        } catch {
            return [];
        }
    }

    /** A loaded window whose hosted widget is already gone gets the closed state, never a blank frame. */
    protected renderClosedStateIfOrphaned(win: Window): void {
        let orphaned = false;
        try {
            for (const widget of this.secondaryWindows.widgets) {
                if (extractSecondaryWindow(widget) === win && widget.isDisposed) {
                    orphaned = true;
                }
            }
        } catch {
            return;
        }
        if (orphaned) {
            this.renderClosedState(win);
        }
    }

    /**
     * Contracted tab-closed state with its window-only close button. Skips
     * closed windows and repeats (marker), never touches the core model.
     * Classes reuse the placeholder slot pattern (centred slot, 14px
     * heading/body, stock button + contracted focus outline in modes.css).
     */
    protected renderClosedState(win: Window): void {
        try {
            if (win.closed) {
                return;
            }
            const doc = win.document;
            if (doc.querySelector('[data-pb-dependent-closed]')) {
                return;
            }
            const host = doc.createElement('div');
            host.setAttribute('data-pb-dependent-closed', 'true');
            host.className = 'pb-modes-dependent-closed';
            const slot = doc.createElement('div');
            slot.className = 'pb-modes-dependent-closed-slot';
            const heading = doc.createElement('div');
            heading.className = 'pb-modes-dependent-closed-heading';
            heading.textContent = DEPENDENT_TAB_CLOSED_HEADING;
            const body = doc.createElement('div');
            body.className = 'pb-modes-dependent-closed-body';
            body.textContent = DEPENDENT_TAB_CLOSED_BODY;
            const close = doc.createElement('button');
            close.type = 'button';
            close.className = 'pb-modes-dependent-closed-close theia-button';
            close.textContent = DEPENDENT_CLOSE_WINDOW_LABEL;
            close.onclick = () => {
                win.close();
            };
            slot.append(heading, body, close);
            host.append(slot);
            doc.body.append(host);
        } catch {
            return;
        }
    }
}
