/**
 * GUI-07: the active mode, published to the DOM as one attribute.
 *
 * 14-UI-SPEC's amended per-mode shell map (2026-09-08) makes furniture
 * presence a function of the mode: Browsing and Organising drop the menubar,
 * the left icon rail, and the status bar; Coding is the only mode that keeps
 * them. That is presentation, so it belongs in a stylesheet -- but CSS cannot
 * see the mode, and before this file nothing in the DOM carried it (verified
 * live 2026-09-08: body, html, and the shell node were byte-identical across
 * all three modes).
 *
 * So the switch path publishes the mode and the sheet reads it. The
 * alternative -- adding/removing classes on each furniture node from
 * TypeScript -- would put layout decisions in three places and leave the
 * shell's own nodes mutated by us, which is exactly the coupling the
 * `verify-mode-switch-tabs-invariant` allowlist exists to bound.
 *
 * Written on `document.body`, not on the shell node: Theia's ApplicationShell
 * owns its own element's classes and rewrites them on layout changes, so an
 * attribute set there is not ours to keep. `body` has no such owner.
 *
 * Reading it back is deliberately NOT offered here. This is a one-way
 * projection of state the mode service already owns; a getter would invite a
 * second source of truth for the active mode, and `PerspectiveService` plus
 * the mode service's own resolution are that truth.
 */

/** The attribute CSS selects on: `body[data-pb-mode="coding"]`. */
export const MODE_ATTRIBUTE = 'data-pb-mode';

/**
 * Publish `id` as the active mode. Custom modes publish their own id, so a
 * sheet can target one by name; the furniture rules key off the absence of
 * `coding` rather than a list of the other two, so a custom mode gets the
 * browser-like shell unless it opts in.
 *
 * Guarded on `document` because the mode service is constructed in tests and
 * in the backend's type-check pass, where no DOM exists.
 */
export function publishModeAttribute(id: string): void {
    if (typeof document === 'undefined' || !document.body) {
        return;
    }
    document.body.setAttribute(MODE_ATTRIBUTE, id);
}
