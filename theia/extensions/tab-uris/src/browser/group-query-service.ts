/**
 * GUI-08 (15-01): frontend group-read contract for Panorama organising.
 *
 * The canvas and tree roots never read `tabs.sqlite` themselves -- the
 * Theia backend's `TabQueryService` holds the single readonly handle and
 * stays the sole reader (the second-writer gate fails any other open by
 * design). The RPC path constant lives here so the persistence gate derives
 * it from this source instead of duplicating the string (CHROME_SUGGESTION_PATH
 * precedent).
 */

import type { GroupRow, GroupTabRow } from '../node/tab-query-service';

/** JSON-RPC path the backend group handler serves on. */
export const GROUP_PATH = '/services/powerbrowser/groups';

/** Group reads over the shared readonly handle, newest contract first. */
export interface GroupQueryService {
    listGroups(): Promise<GroupRow[]>;
    getGroupTabs(groupId: string): Promise<GroupTabRow[]>;
    getThumbnail(uri: string): Promise<string | undefined>;
    listUngroupedTabs(): Promise<GroupTabRow[]>;
}

export const GroupQueryService = Symbol('GroupQueryService');
