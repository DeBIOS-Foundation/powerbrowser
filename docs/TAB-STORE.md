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
typing one opens nothing. Split editors share one row.

## Open and closed rows

A row with `closed_at` NULL is open, or restorable (its tab ended with a
session and has a group, so Panorama shows it as a card that reopens the
tab). The row is marked closed, `closed_at` set, when:

- the user closes the tab (a stock tab's close, a web tab's close, an organised editor or terminal closed),
- a stock tab is gone from sessionstore's open tabs (its window closed),
- at startup, an ungrouped web tab ended with the last session, placed or
  not. The launch restore reopens the row of each tab it brings back; an
  ungrouped web tab it leaves stays closed-tab history, with no card.

A quit or a frontend reload never closes a row. Theia rows ending with a quit
stay open. Closed rows are closed-tab
history; the prune deletes a closed row once `closed_at` is older than the
retention. A row with `closed_at` NULL is never pruned.

## Settings

The `settings` table holds the store's own settings, one text value per key,
seeded at v5. A value changes through the `setSetting` op of the documented
write path (wave B, decisions.md R18), which goes through the chrome writer
and refuses a value outside the key's valid values below. With PowerBrowser
closed, any SQLite client can edit a value too. A reader that finds a value
it cannot use (not a number where one is needed, or negative) falls back to
the default.

| Key | Valid values | Default | Read by | Meaning |
|---|---|---|---|---|
| `closed_retention_days` | a number from 0 to 3650, decimals allowed | `7` | the sweep's prune | Closed-tab history older than this many days is deleted |
| `integrity_check_minutes` | a number greater than 0 and at most 525600, decimals allowed | `1440` | the integrity schedule | Minutes between full integrity checks |
| `restore_behaviour` | `session` or `none` | `session` | the launch restore | `session`: reopen the last session's web tabs; `none`: reopen nothing; grouped tabs stay as Panorama cards, ungrouped ones become closed-tab history |
| `restore_live_minutes` | a number from 0 to 10080, decimals allowed | `5` | the launch restore | A tab looked at within this many minutes of the quit reopens with its back/forward history |
| `restore_url_days` | a number from 0 to 3650, decimals allowed | `30` | the launch restore | A tab looked at within this many days reopens at its URL; an older one stays a card when it is grouped and becomes closed-tab history when it is not |

## Integrity and quarantine

At startup the writer runs `PRAGMA quick_check`; every
`integrity_check_minutes` it runs the full `PRAGMA integrity_check`, which
also compares index contents. A result other than a single `ok` trips the
store. A file that cannot be opened is classified first: a corruption signal
(`SQLITE_CORRUPT` or `SQLITE_NOTADB`) trips it like a failed check, while a
busy store, a timeout, any other open failure, or a `user_version` newer than
the head leaves the store degraded for a retry at the next interval, never
quarantined. On a trip the file is copied to the next free
`tabs.sqlite.corrupt-<N>` (never overwritten, never deleted), the `-wal`,
`-shm` and `-journal` files are removed, and the store is rebuilt at the head
from sessionstore's open and recently closed tabs. Groups rebuild empty; the
corrupt copy keeps the lost membership. The settings rebuild at their
defaults; a changed value survives only in the corrupt copy. A file whose `user_version` is newer
than the build is refused and left untouched, never quarantined. The
scheduled check reads its interval from the settings table before each wait
and stops at shutdown; the integrity log lines carry a fixed reason, never
the raw error.

## Reader contract

`TabQueryService` opens the file read-only and checks `user_version`. A store
it cannot read -- no profile directory, a missing or unopenable file, a
version other than the head -- is an error naming the cause, never an empty
answer; Organising shows its load-error state and the address bar its
provider error. Panorama and suggestion reads serve open rows only
(`closed_at` NULL). Its methods: `listGroups`, `getGroupTabs`,
`listUngroupedTabs`, `getThumbnail` and `getSettings` over the group
channel; `searchByPrefix` for the address bar.

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
