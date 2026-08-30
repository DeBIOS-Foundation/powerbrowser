// The PowerBrowser mark, sourced verbatim from `logo/LE logo.svg` (six shapes:
// three crossed lens ellipses plus three dots, `viewBox="0 0 99 85.9"`).
//
// The source SVG's single fill rule (`.a{fill:#fff;}`) is white-on-white and
// invisible against a light surface (tab strip, light OS theme). Per D-36,
// recolored here with a two-value pair inside the SVG's own
// `<defs><style>` block: a dark default plus a
// `@media (prefers-color-scheme: dark)` override back to white. Firefox
// honours `prefers-color-scheme` inside an inlined SVG favicon, so the mark
// stays visible on both a light and a dark tab strip with no brand hex
// invented -- `#1a1a1a` is a neutral dark, not a chosen brand colour.

export const POWERBROWSER_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99 85.9"><defs><style>.a{fill:#1a1a1a;}@media (prefers-color-scheme: dark){.a{fill:#fff;}}</style></defs><ellipse class="a" cx="54.9" cy="43" rx="3.1" ry="49.5" transform="matrix(0.87, -0.5, 0.5, 0.87, -14.13, 33.21)"/><circle class="a" cx="49.5" cy="58.4" r="3.1"/><ellipse class="a" cx="44.1" cy="43" rx="49.6" ry="3.1" transform="translate(-15.1 59.7) rotate(-60)"/><circle class="a" cx="38.9" cy="39.9" r="3.1"/><ellipse class="a" cx="49.5" cy="52.3" rx="49.5" ry="3.1"/><circle class="a" cx="60.3" cy="39.9" r="3.1"/></svg>`;

export const POWERBROWSER_MARK_DATA_URI = `data:image/svg+xml,${encodeURIComponent(POWERBROWSER_MARK_SVG)}`;
