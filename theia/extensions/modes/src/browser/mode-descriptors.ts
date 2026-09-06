import { ApplicationShell } from '@theia/core/lib/browser';
import { PerspectiveDescriptor } from '@theia/core/lib/browser/perspective-service';

/**
 * GUI-07 (14-01): the three shipped mode defaults as stock perspective
 * descriptors, in contracted toggle order (Coding, Browsing, Organising).
 *
 * Modes are data with shipped defaults, never manifest flags: no `[modes]`
 * section exists anywhere, and custom modes (plan 14-02) register as
 * additional descriptors built from user-storage JSON — a custom mode never
 * mutates an entry of SHIPPED_MODES in place.
 *
 * Strip binding (13-01 verdict RED): the tab strip stays top in every mode,
 * so no descriptor names the strip, the top area, or any relocation. Modes
 * reshape panel visibility and the main-area view only, per 14-UI-SPEC:
 * Browsing (launch default) and Organising collapse all three side areas;
 * Coding leaves Explorer visible with the remaining areas per saved layout.
 * The Organising placeholder show/hide hooks land in plan 14-02.
 */
const coding: PerspectiveDescriptor = {
    id: 'coding',
    label: 'Coding',
    viewPlacements: new Map<string, ApplicationShell.Area>([
        ['explorer-view-container', 'left'],
    ]),
};

const browsing: PerspectiveDescriptor = {
    id: 'browsing',
    label: 'Browsing',
    viewPlacements: new Map<string, ApplicationShell.Area>(),
    chromeOptions: { collapseAreas: ['left', 'right', 'bottom'] },
};

const organising: PerspectiveDescriptor = {
    id: 'organising',
    label: 'Organising',
    viewPlacements: new Map<string, ApplicationShell.Area>(),
    chromeOptions: { collapseAreas: ['left', 'right', 'bottom'] },
};

/** The shipped defaults in contracted order. Later plans append; never reorder here. */
export const SHIPPED_MODES: ReadonlyArray<PerspectiveDescriptor> = [coding, browsing, organising];

/**
 * GUI-07 (14-02): the organising main-area slot seam.
 *
 * The organising descriptor's activation hooks (task 2) and the mode
 * service's switch path share these module functions so placeholder show and
 * hide stay one seam: the placeholder contribution registers its
 * contribution-routed open and close here at startup, and both callers stay
 * idempotent (open when open reveals, close when closed no-ops). Before the
 * contribution registers, both are silent no-ops -- never a throw.
 */
export interface OrganisingSlot {
    open(): void;
    close(): void;
}

let organisingSlot: OrganisingSlot | undefined = undefined;

/** Called once by the placeholder contribution at startup; never by anyone else. */
export function registerOrganisingSlot(slot: OrganisingSlot | undefined): void {
    organisingSlot = slot;
}

/** Show the organising placeholder through the registered contribution. */
export function openOrganisingSlot(): void {
    organisingSlot?.open();
}

/** Hide the organising placeholder through the registered contribution. */
export function closeOrganisingSlot(): void {
    organisingSlot?.close();
}
