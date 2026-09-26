# The tab store (`tabs.sqlite`)

`tabs.sqlite` in the profile directory holds one row per tab PowerBrowser has
seen: stock browser tabs, in-shell web tabs (a New Tab included), and the
editors, terminals and views that have been organised in Panorama. It records
group membership, canvas position, order within a group, a last-view
thumbnail, content age and closed-tab history. It is a user-queryable
substrate (`.planning/notes/tab-sql-substrate.md`), so this page is its
contract.

One writer: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, chrome-side, over
mozStorage, in WAL mode. Readers: the Theia backend's `TabQueryService`
(read-only `better-sqlite3`, `theia/extensions/tab-uris/src/node/`) and
offline checks on copies. Sessionstore stays authoritative for restoring
stock tabs; the store is rebuilt from it, never the reverse.

## Schema at head (`user_version = 5`)

| Table | Column | Type | Since | Meaning |
|---|---|---|---|---|
| `tabs` | `uri` | TEXT PRIMARY KEY | v1 | The row key; see "Row keys" |
| `tabs` | `url` | TEXT NOT NULL | v1 | The tab's current address; `''` for a tab with no page |
| `tabs` | `title` | TEXT NOT NULL | v1 | The tab's title |
| `tabs` | `last_active` | INTEGER NOT NULL | v1 | Last time the tab was seen open (ms since epoch) |
| `tabs` | `group_id` | TEXT NULL | v2 | The group it is in (`groups.id`) |
| `tabs` | `thumbnail` | TEXT NULL | v2 | PNG data URL of its last view |
| `tabs` | `x`, `y` | INTEGER NULL | v3 | Where a loose card sits on the canvas; NULL = never placed |
| `tabs` | `ord` | INTEGER NULL | v4 | Place within its group; NULL = never arranged |
| `tabs` | `created_at` | INTEGER NULL | v5 | When the row was created; NULL = before v5 |
| `tabs` | `last_accessed` | INTEGER NULL | v5 | Last time the user looked at the tab; NULL = not recorded |
| `tabs` | `closed_at` | INTEGER NULL | v5 | When the user closed it; NULL = open or restorable |
| `groups` | `id`, `title`, `x`, `y`, `w`, `h`, `is_active` | | v2 | Panorama group boxes |
| `settings` | `key`, `value` | TEXT, TEXT | v5 | Store settings; see "Settings" |

Indexes: `idx_tabs_last_active`, `idx_tabs_group`, `idx_tabs_closed_at`, `idx_groups_active`.

## Row keys

One rule for every tab: `tabs.uri` is `<kind>:<identity>`, never the page
URL. The page URL is the `url` column. Two tabs on one page are two rows, and
a navigation updates its tab's row in place.

| Tab | Key | Where the identity comes from |
|---|---|---|
| Stock browser tab | `stock:<stamp>-<n>` | Minted the first time the store sees the tab; kept on the tab as the sessionstore custom tab value `powerbrowser-tab-key`, so it survives navigation and a restored session |
| In-shell web tab, New Tab included | `web:<id>` | The tab's own id (`wt-<session>-<n>`), or the key a Panorama card passed when it reopened the tab |
| Editor, terminal, view | its address, e.g. `terminal:t1`, `view:welcome`, `file:///home/me/note.txt` | `TabUriRegistry.uriOf`, else the editor's resource URI, else `widget:<widget id>` |

Rows migrated from v4 and earlier keep their data under `stock:legacy-<rowid>`
(was `webview:<url>`) and `web:legacy-<rowid>` (was the bare page URL).
`webview:` is the plugin-panel address scheme (docs/URI-SCHEMES.md) and is
never a row key. The stock and web keys are identities, not addresses:
typing one opens nothing.

## Open and closed rows

A row with `closed_at` NULL is open, or restorable (its tab ended with a
session and has a group or a position, so Panorama shows it as a card that
reopens the tab). The row is marked closed, `closed_at` set, when:

- the user closes the tab (a stock tab's close, a web tab's close, an organised editor or terminal closed),
- a stock tab is gone from sessionstore's open tabs (its window closed),
- at startup, a web tab nobody grouped or placed ended with the last session.

A quit or a frontend reload never closes a row. Closed rows are closed-tab
history; the prune deletes a closed row once `closed_at` is older than the
retention. A row with `closed_at` NULL is never pruned.

## v1

`CREATE TABLE tabs (uri, url, title, last_active)` and `idx_tabs_last_active`,
written at creation with `user_version = 1`
(`.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md`).

## v2

The `groups` table and `idx_groups_active`; `tabs.group_id` with
`idx_tabs_group`, and `tabs.thumbnail`. Panorama groups (GUI-08).

## v3

`tabs.x` and `tabs.y`: where a loose card sits on the canvas.

## v4

`tabs.ord`: a tab's place within its group.

## v5

`tabs.created_at`, `tabs.last_accessed`, `tabs.closed_at` with
`idx_tabs_closed_at`; the `settings` table seeded with `closed_retention_days`,
`integrity_check_minutes`, `restore_behaviour`, `restore_live_minutes` and
`restore_url_days`; and the key rewrite (`webview:<url>` to
`stock:legacy-<rowid>`, a bare page URL to `web:legacy-<rowid>`) in the same
transaction, in place, so every row keeps its group, position, order and
thumbnail.

## Migrations

The writer runs one forward chain (`migrateTabStoreToHead`) from the file's
`user_version` to the head, one transaction per version, each step a no-op
when its work is already done. A file newer than the head is refused and
left untouched. `scripts/verify-ng-015-real-migration-from-every-version.mjs` runs the chain in the built
browser from a store at every shipped version.
