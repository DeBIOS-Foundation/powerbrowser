// The Power Browser placeholder mark (D-11). Original geometry -- a broken ring
// and a bar, the IEC 60417-5009 power glyph -- authored for this repo, not a
// recolour, crop, trace, or rearrangement of the upstream project's
// crossed-lens-and-dots mark (which stays downstream under D-03 and is not in
// this repo) or of any Mozilla mark. That project is named only in
// inventory/brand-tokens.json: every other file here is inside the D-18 scan's
// scope, and spelling the token would make this file fail that gate.
//
// The SVG string below is byte-identical to the single-line <svg> element in
// `brand/mark.svg`, which is the one source all ten
// `branding/{dev,release}/default{16,32,48,64,128}.png` rasters are rendered
// from. `scripts/verify-branding-preflight.mjs` asserts that equality on every
// run: the two are the same asset expressed twice, and nothing else in the tree
// would notice if they drifted -- the module would keep compiling and the
// window icon and the tab-strip favicon would simply stop being the same mark.
//
// SQUARE viewBox (0 0 128 128), which is why the two consumers below render at
// 64x64 and 48x48 rather than the 64x56 / 48x42 they carried before. Those
// magic numbers were artifacts of the previous mark's 99x85.9 aspect and had no
// other justification.
//
// The two-value fill pair is load-bearing, not decorative (D-36). This mark
// ships as the tab-strip favicon, which follows the OS theme independently of
// the shell's background, so a single-fill mark disappears against one of the
// two. Gecko honours `prefers-color-scheme` inside an inlined SVG favicon. No
// brand hue is invented here: `#1a1a1a` is the shell's dominant neutral and
// `#fff` its ink, neither is a chosen brand colour, and Phase 1 deliberately
// keeps the tree's zero-invented-colours property.
//
// THAT REASONING HOLDS FOR THE FAVICON AND FOR NOTHING ELSE, which is what the
// paragraph above used to get wrong by generalising from one consumer to three.
// `prefers-color-scheme` inside a data-URI `<img>` follows the OPERATING
// SYSTEM. The favicon is an OS-chrome surface and that is correct for it. The
// about dialog and the welcome widget are not: they render on the Theia shell's
// own background, whose colour is the THEIA theme's, so on a light-mode OS they
// drew `#1a1a1a` on a `#1a1a1a`-family background and the mark simply vanished.
//
// So there are two exports, one per surface, and the difference between them is
// which theme they follow:
//
//   POWERBROWSER_MARK_DATA_URI  -- OS theme, via prefers-color-scheme. Favicon.
//   powerBrowserMarkInline()    -- Theia theme, via currentColor. In-shell.
//
// currentColor requires the SVG to be part of the document, so the in-shell form
// is rendered INLINE rather than through `<img>`; an `<img>` is a separate
// document and inherits nothing from the page.

export const POWERBROWSER_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><style>.a{fill:#1a1a1a;}@media (prefers-color-scheme: dark){.a{fill:#fff;}}</style></defs><path class="a" d="M89.24 27.96A44 44 0 1 1 38.76 27.96L45.64 37.79A32 32 0 1 0 82.36 37.79Z"/><rect class="a" x="58" y="18" width="12" height="46" rx="6"/></svg>`;

export const POWERBROWSER_MARK_DATA_URI = `data:image/svg+xml,${encodeURIComponent(POWERBROWSER_MARK_SVG)}`;

/**
 * The same mark, inheriting the Theia theme's foreground colour.
 *
 * DERIVED from POWERBROWSER_MARK_SVG, never restated. That string is asserted
 * byte-equal to `brand/mark.svg` on every preflight run, and it is the one
 * source the ten branding rasters are rendered from; a second copy of the
 * geometry here would be a second source of truth about the same asset, which
 * is precisely what CLAUDE.md's verification rules forbid. The transform drops
 * the OS-driven `<style>` block and swaps the class for `fill="currentColor"`,
 * so the mark takes whatever the surrounding Theia theme sets as its text
 * colour and follows a live theme switch with no listener.
 *
 * `width`/`height` are injected because an inline `<svg>` carrying only a
 * viewBox falls back to 300x150, not to its container.
 */
export function powerBrowserMarkInline(size: number): string {
    return POWERBROWSER_MARK_SVG
        .replace(/<defs>[\s\S]*?<\/defs>/, '')
        .replace(/class="a"/g, 'fill="currentColor"')
        .replace('<svg ', `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false" `);
}
