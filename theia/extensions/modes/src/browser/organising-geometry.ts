/**
 * GUI-08 (W9): groups never overlap.
 *
 * Panorama's `Item.pushAway`: move or grow a group and anything it lands on
 * slides clear, so the canvas stays a set of readable boxes instead of a pile.
 * Overlapping boxes are not merely untidy -- a covered group's cards cannot be
 * seen or dropped on, so the canvas silently stops being able to do its job.
 *
 * Its own file, with no imports, for the same reason the tiling arithmetic
 * has one: it is pure geometry, and pure geometry is worth checking without a
 * browser in the loop. This algorithm has already been wrong once -- see the
 * clamp note in `escape` -- and the failure was invisible from the outside,
 * because two boxes that stay overlapped look exactly like two boxes that
 * were never pushed.
 */

export interface Box {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Space left between two boxes that had to be separated. */
export const PUSH_GAP = 12;

/** Bounded so a pathological arrangement cannot spin. */
const ESCAPE_ATTEMPTS = 6;

export function overlaps(a: Box, b: Box): boolean {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Where `box` goes to clear `blocker`: the cheapest of the four ways out that
 * still leaves it on the canvas.
 *
 * The in-bounds filter is the whole subtlety. Taking the cheapest direction
 * unconditionally and clamping the result at zero afterwards looks equivalent
 * and is not: when the cheapest escape is up or left and the box is already
 * near an edge, the clamp cancels the move, the pair stays overlapped, and
 * every further pass picks the same cancelled direction again. Filtering
 * first means the cheapest SURVIVING direction wins instead.
 */
function escapes(box: Box, blocker: Box): { cost: number; x: number; y: number }[] {
    return [
        { cost: blocker.x + blocker.w - box.x, x: blocker.x + blocker.w + PUSH_GAP, y: box.y },
        { cost: box.x + box.w - blocker.x, x: blocker.x - box.w - PUSH_GAP, y: box.y },
        { cost: blocker.y + blocker.h - box.y, x: box.x, y: blocker.y + blocker.h + PUSH_GAP },
        { cost: box.y + box.h - blocker.y, x: box.x, y: blocker.y - box.h - PUSH_GAP },
    ].filter(option => option.x >= 0 && option.y >= 0)
        .sort((one, other) => one.cost - other.cost);
}

/** The single rectangle covering every box in `boxes`. */
function union(boxes: readonly Box[]): Box {
    const left = Math.min(...boxes.map(box => box.x));
    const top = Math.min(...boxes.map(box => box.y));
    const right = Math.max(...boxes.map(box => box.x + box.w));
    const bottom = Math.max(...boxes.map(box => box.y + box.h));
    return { id: '', x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Separates every box from `anchorId`, and from each other, returning only
 * the boxes that had to move. The anchor never moves: it is the one the user
 * just placed, and moving it would fight the gesture that placed it.
 *
 * Boxes settle in order of distance from the anchor, each pushed clear of the
 * ones already settled. That ordering is what makes a chain resolve -- push B
 * off A and B may land on C, so C is separated from B's new position rather
 * than its old one -- and it makes the result deterministic, which a
 * simultaneous relaxation over all pairs would not be.
 */
export function pushAway(boxes: readonly Box[], anchorId: string): Map<string, { x: number; y: number }> {
    const moved = new Map<string, { x: number; y: number }>();
    const anchor = boxes.find(box => box.id === anchorId);
    if (!anchor) {
        return moved;
    }
    const centre = (box: Box): { x: number; y: number } => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
    const origin = centre(anchor);
    const settled: Box[] = [anchor];
    const rest = boxes
        .filter(box => box.id !== anchorId)
        .map(box => ({ ...box }))
        .sort((one, other) => {
            const a = centre(one);
            const b = centre(other);
            return Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y);
        });

    for (const box of rest) {
        const from = { x: box.x, y: box.y };
        for (let attempt = 0; attempt < ESCAPE_ATTEMPTS; attempt += 1) {
            const blockers = settled.filter(candidate => overlaps(candidate, box));
            if (!blockers.length) {
                break;
            }
            // Escape the blockers TOGETHER, as one rectangle. Clearing them
            // one at a time oscillates: the cheapest way off A puts the box on
            // B, the cheapest way off B puts it back on A, and the loop runs
            // out of attempts still overlapping both -- which is exactly what
            // this did before, on 307 of 400 random arrangements.
            const options = escapes(box, union(blockers));
            const clear = options.find(option =>
                settled.every(candidate => !overlaps(candidate, { ...box, x: option.x, y: option.y })));
            const to = clear ?? options[0];
            if (!to) {
                break;
            }
            box.x = Math.max(0, Math.round(to.x));
            box.y = Math.max(0, Math.round(to.y));
        }
        // Guaranteed exit. Past the whole arrangement on one axis nothing can
        // overlap, so a crowded canvas still separates rather than giving up
        // mid-loop; whichever axis moves the box less wins.
        if (settled.some(candidate => overlaps(candidate, box))) {
            const below = Math.max(...settled.map(candidate => candidate.y + candidate.h)) + PUSH_GAP;
            const beside = Math.max(...settled.map(candidate => candidate.x + candidate.w)) + PUSH_GAP;
            if (below - box.y <= beside - box.x) {
                box.y = below;
            } else {
                box.x = beside;
            }
        }
        if (box.x !== from.x || box.y !== from.y) {
            moved.set(box.id, { x: box.x, y: box.y });
        }
        settled.push(box);
    }
    return moved;
}
