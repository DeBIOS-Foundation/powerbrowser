/**
 * GUI-08 (W7): the group grid's sizing rule, and nothing else.
 *
 * Panorama's `_gridArrange`: every card in a group is the same size, and that
 * size is the largest one at which they ALL fit. Resizing the group re-packs
 * them; it never produces a scrollbar, because a scrolled group hides exactly
 * the tabs the canvas was opened to see.
 *
 * Its own file, with no imports, for one reason: in the widget it could not
 * be exercised without a DOM. Anything importing `organising-widget` drags in
 * Lumino, which touches `document` at module load, so a check of this
 * arithmetic could only ever run inside a browser -- and arithmetic is the
 * half of the grid most worth checking, since a wrong answer here is cards
 * silently overflowing their box.
 */

/** Gap between tiles, both axes. */
export const TILE_GAP = 8;

/** Tile height as a fraction of its width: preview plus one title line. */
export const TILE_ASPECT = 0.72;

/** The smallest tile still worth rendering; below this a group stacks (W8). */
export const TILE_MIN_W = 84;
export const TILE_MIN_H = Math.round(TILE_MIN_W * TILE_ASPECT);

export interface TileCell {
    cols: number;
    w: number;
    h: number;
}

/**
 * The largest uniform tile at which `count` cards all fit in `width` x
 * `height`, or undefined when even the floor size will not -- the caller
 * falls back to scrolling there.
 *
 * Every column count is tried rather than derived, because the best one is
 * not monotonic: more columns means narrower tiles but fewer rows, and which
 * of the two binds depends on the box's aspect ratio.
 */
export function fitTiles(count: number, width: number, height: number): TileCell | undefined {
    let best: TileCell | undefined;
    for (let cols = 1; cols <= count; cols += 1) {
        const rows = Math.ceil(count / cols);
        const byColumn = Math.floor((width - TILE_GAP * (cols - 1)) / cols);
        const byRow = Math.floor((height - TILE_GAP * (rows - 1)) / rows);
        const h = Math.min(Math.floor(byColumn * TILE_ASPECT), byRow);
        const w = Math.floor(h / TILE_ASPECT);
        if (h < TILE_MIN_H || w < TILE_MIN_W || w > byColumn) {
            continue;
        }
        if (!best || w > best.w) {
            best = { cols, w, h };
        }
    }
    return best;
}
