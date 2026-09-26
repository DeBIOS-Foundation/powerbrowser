# Tab store access

Power Browser keeps its tab and group data in `tabs.sqlite` in your profile directory. While Power Browser runs, this endpoint is the supported way for you, your scripts and MCP clients (programs that speak the Model Context Protocol, such as AI agents) to read that data and, through Power Browser's own writer, change it. Nothing else may open `tabs.sqlite` for writing.

## Connecting

At start-up Power Browser writes `store-access.json` into the profile directory:

```json
{"url": "http://127.0.0.1:43127/mcp", "token": "<64 hexadecimal characters>"}
```

- Only your user account can read the file (mode 0600).
- The port and the token are new every time Power Browser starts. Read the file again after a restart.
- A normal quit removes the file.

Send each request as an HTTP POST of one JSON-RPC 2.0 message to `url`, with these headers:

```text
Content-Type: application/json
Authorization: Bearer <token>
```

The endpoint speaks MCP over HTTP with single JSON responses: `initialize`, `tools/list` and `tools/call`.

## Security

- The endpoint listens on 127.0.0.1 only.
- A request without the right token gets HTTP 401.
- A request that carries an `Origin` header gets HTTP 403. Browsers send `Origin` with every POST, so no web page can use the endpoint, including a page served from 127.0.0.1 that holds the token.
- A request whose `Host` header is not the endpoint's own address gets HTTP 403. This stops DNS-rebinding attacks.

## Tools

| Tool | Arguments | Result |
|---|---|---|
| `tabs_sql` | `sql` (string), `params` (array, optional) | `{columns, rows, truncated}` |
| `history_entry` | `url` (exact address) | `{entry}`: `{url, title}`, or `null` when the page is not in history |
| `bookmark_by_url` | `url` (exact address) | `{bookmark}`: `{guid, title, url}`, or `null` |
| `bookmark_folder` | `guid` (a folder's 12-character bookmark GUID) | `{rows}`: the folder's children, each `{guid, title, url}` |
| `sessionstore_tabs` | none | `{rows}`: the open tabs as session restore records them, each `{uri, url, title, last_active}` |
| `tabs_with_places` | `bookmarked` (boolean, optional), `open` (boolean, optional), `limit` (1–1000, default 200) | `{rows}`: each tab row joined to its history and bookmark, highest frecency first |

A tool that cannot run answers with `isError: true` and a message that says why.

### `tabs_sql`

Runs one read-only SQL statement against `tabs.sqlite`.

- The statement must return rows: `SELECT`, or `WITH … SELECT`. Statements that write are refused, and the database is also opened read-only.
- `ATTACH`, `DETACH`, `VACUUM`, `PRAGMA` and `load_extension` are refused wherever they appear, comments included. Read the schema with the table-valued functions instead, for example `SELECT name, type FROM pragma_table_info('tabs')`.
- Put values in `params` and refer to them with `?`. Do not paste text you did not write into `sql`.
- Each row of `tabs` is one tab, keyed by its identity in `uri` (`stock:…`, `web:…`, or a Theia address such as `terminal:build`). `url` is the page address (`''` for a tab with no page), and `closed_at` is `NULL` while the tab is open. `docs/TAB-STORE.md` describes every table and column.
- Limits: 5 seconds per statement, 1000 rows, 8 MiB of row data, two statements at a time. `truncated` is `true` when a limit cut the rows short.

### History, bookmarks and session tools

`history_entry`, `bookmark_by_url`, `bookmark_folder` and `sessionstore_tabs` read Firefox's own history, bookmarks and session data. Power Browser answers them from its browser side, passing each request through an open Power Browser window. While no window is open they answer with `isError: true` and "no Power Browser window is connected". Private windows are never included.

### `tabs_with_places`

Joins every tab row to Firefox's history and bookmarks on the page address (`url`). Each row carries the tab's `uri`, `url`, `title`, `group_id`, `last_active` and `closed_at`, plus `open` (true while `closed_at` is `NULL`), `visited`, `frecency` (the browser's own ranking of how often and how recently you visit the page), `visit_count`, `last_visit` (epoch milliseconds), `bookmark_guid` and `bookmark_title`. Tabs that are not web pages carry no history or bookmark data. Closed tabs stay in the store as history until the retention setting prunes them, so `"open": true` is the filter for tabs that are open now.

- Open tabs you have never bookmarked: `{"bookmarked": false, "open": true}`
- Bookmarks that are open right now: `{"bookmarked": true, "open": true}`

Private windows are never included: their tabs are never written to the store, and neither the join above nor the address bar's history and bookmark suggestions (NG-023) ever offer a private page.

## Example

```sh
ACCESS="$PROFILE_DIR/store-access.json"
URL=$(jq -r .url "$ACCESS")
TOKEN=$(jq -r .token "$ACCESS")
curl -s "$URL" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tabs_sql","arguments":{"sql":"SELECT url, title FROM tabs ORDER BY last_active DESC LIMIT 10"}}}'
```

## MCP clients

Configure an HTTP MCP server with the `url` from `store-access.json` and the header `Authorization: Bearer <token>`. Both change when Power Browser restarts, so update the client's configuration after a restart.
