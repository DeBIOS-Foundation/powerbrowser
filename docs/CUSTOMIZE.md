# Customizing PowerBrowser

PowerBrowser's customization seam (R4a) has two layers: a user CSS file that
always exists as an address but never as a file, and a developer-only JS
layer that is off by default and stays off unless the build says otherwise.

## The CSS layer

The file is `$THEIA_CONFIG_DIR/customize.css`, next to `settings.json` and
`keymaps.json` — the same directory a human already knows to look in, and
the same one every PowerBrowser window shares regardless of which workspace is
open. **PowerBrowser never creates this file.** Its absence is the default,
untouched state: with no file present, the app renders exactly as it would
with an empty one — this is CUST-01's whole guarantee, and it is proven by
pixel comparison (`scripts/verify-customize-inert.mjs`), not asserted.

The layer is injected after every one of Theia's own style contributions
and before the shell is attached, so it is present on first paint with no
flash, and it is re-asserted last in document order on every reload —
including past Monaco's colour sheet and any terminal's per-instance sheet,
both of which are injected later in a session. Because of that ordering,
CSS written against Theia's own custom properties (`var(--theia-*)`)
tracks the active theme for free, and switching themes never displaces the
layer.

The file's literal bytes are used with no wrapper: no added selector, no
`:root {}` scope, no body class, no comment banner. One practical
consequence: a malformed rule is silently dropped by the browser's own CSS
parser, the same as it would be in any stylesheet — it does not throw or
break the rest of the file.

Editing the file while PowerBrowser is running restyles the page within about
a second, no reload needed — the same recursive filesystem watch that
already covers `settings.json` and `keymaps.json` covers this file too, so
there is nothing to configure.

## The JS layer (developer-only)

A second file, `$THEIA_CONFIG_DIR/customize.js`, can run arbitrary code
inside the frontend at startup — but only when the build was produced with
`theia.frontend.config.powerbrowserPrivilegedJs` set to `true` in
`applications/browser/package.json`. This is a **build-time** flag: `theia
start` never re-reads it, only `theia generate`/`theia build` do, so
flipping it needs a rebuild, not a restart. That immovability is
deliberate — it is what makes a release build impossible to talk into
executing this layer through any runtime input (a URL parameter, a
`window.location.hash`, or an environment variable were all considered and
rejected for exactly that reason).

With the flag on, `customize.js` receives a small, stable surface:

- the frontend's Inversify DI container
- the application shell

Nothing else auto-runs, and the file is never created for you, same as
`customize.css`. A script that throws at its top level is reported to the
console and does not take the frontend down. If the script registers a new
URI scheme, it must go through `DefaultOpenerService.addHandler()`, which
returns a disposable — binding a new `OpenHandler` into the container after
startup has no effect, because Theia's contribution provider caches its
handler list on first use and does not see a later addition.

### Security posture, stated plainly

The generated frontend bootstrap publishes the entire DI container on
`window.theia.container` in **every** build, development and production
alike. Any script already running inside the Theia page — from a
compromised extension, an injected `<script>`, or anything else with page
execution — already owns that container regardless of this flag. **The
flag is not a security boundary against script already executing in the
page.** What it decides is exactly one thing: whether PowerBrowser itself
auto-executes a user-supplied JS file from disk at startup.

One honest caveat: with the flag off, the *binding* for the privileged
layer does not exist — `window.theia.container.isBound(...)` on its token
reports `false`, and that is CUST-02's literal requirement. The *class*
implementing that layer is still present in the compiled bundle, because
tree-shaking cannot remove code that is only reachable behind a runtime
configuration read. The flag guarantees the binding is absent, not that
the artifact is smaller.

### Pre-existing reach, not a new hole

Reading `customize.css`/`customize.js` adds no capability the app did not
already have: the frontend's file provider already proxies the backend's
disk provider with no root restriction, for the workspace file tree and
everywhere else. The workspace was never a sandbox, and this file's
location — inside the PowerBrowser config directory rather than a workspace —
is not a security boundary either way.
