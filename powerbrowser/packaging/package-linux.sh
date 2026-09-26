#!/usr/bin/env bash
# powerbrowser/packaging/package-linux.sh -- the Linux package (NG-063, NG-072).
# Runs `./mach package`, then:
#   - stages the Theia sidecar, the pinned official Node release (R13) and
#     distribution/policies.json into the packaged app dir;
#   - refreshes precomplete, because full MARs are made from this dir;
#   - rewrites the tarball mach wrote.
# objdir/dist/bin is not touched, so dev runs keep the dev tree.
# Run from the repo root inside `nix develop .#firefox`, after a Gecko build and a Theia
# `yarn build`:
#   nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OBJ="$ROOT/${POWERBROWSER_OBJDIR:-objdir}"
APP="$ROOT/theia/applications/browser"
fail() { echo "package-linux: FAIL -- $*" >&2; exit 1; }
test -f "$APP/lib/backend/main.js" || fail "$APP/lib/backend/main.js is absent; run yarn build in theia/ first"

# The pinned official Node release (R13), downloaded once into the git-ignored .mozbuild/.
read -r NODE_VERSION NODE_URL NODE_SHA < <(python3 -c 'import json,sys; p=json.load(open(sys.argv[1]))["linux-x64"]; print(p["version"], p["url"], p["sha256"])' "$ROOT/powerbrowser/packaging/node-runtime.json")
CACHE="$ROOT/.mozbuild/node-dist"; mkdir -p "$CACHE"
ARCHIVE="$CACHE/$(basename "$NODE_URL")"
# M3: never leave a partial download or a partial tarball behind on failure.
TARBALL=""
trap 'rm -f "$ARCHIVE.part" ${TARBALL:+$TARBALL.tmp}' ERR
if [ ! -f "$ARCHIVE" ]; then curl -fsSL -o "$ARCHIVE.part" "$NODE_URL" && mv "$ARCHIVE.part" "$ARCHIVE"; fi
echo "$NODE_SHA  $ARCHIVE" | sha256sum -c --quiet - || { rm -f "$ARCHIVE"; fail "$ARCHIVE does not hash to the pin in powerbrowser/packaging/node-runtime.json"; }

( cd "$ROOT/upstream" && MOZCONFIG=../.mozconfig ./mach package )

VERSION="$(sed -n 's/^Version=//p' "$OBJ/dist/bin/application.ini")"
STAGE="$(find "$OBJ/dist" -mindepth 1 -maxdepth 1 -type d -newer "$OBJ/dist/bin/application.ini" -exec test -f '{}/precomplete' \; -print | head -n 1)"
test -n "$STAGE" || { echo "package-linux: FAIL -- no staged app dir with a precomplete under $OBJ/dist" >&2; exit 1; }
rm -rf "$STAGE/theia" "$STAGE/node"
mkdir -p "$STAGE/theia" "$STAGE/node/bin" "$STAGE/distribution"
cp -a "$APP/lib" "$STAGE/theia/lib"
find "$STAGE/theia/lib" -name '*.map' -delete
cp "$APP/package.json" "$STAGE/theia/package.json"
if [ -d "$APP/plugins" ]; then cp -a "$APP/plugins" "$STAGE/theia/plugins"; fi
# F7: better-sqlite3 stays outside the backend bundle (esbuild external in
# theia/applications/browser/esbuild.mjs), so the packaged backend carries the
# real package's runtime files: its JS wrapper plus the one linux-x64 prebuilt
# binding. Node resolution walks up from lib/backend, so node_modules/ beside
# lib/ resolves require('better-sqlite3') the same way theia/node_modules/
# does for a dev run.
mkdir -p "$STAGE/theia/node_modules/better-sqlite3/lib" "$STAGE/theia/node_modules/better-sqlite3/prebuilds"
cp -a "$ROOT/theia/node_modules/better-sqlite3/lib/." "$STAGE/theia/node_modules/better-sqlite3/lib/"
cp "$ROOT/theia/node_modules/better-sqlite3/package.json" "$STAGE/theia/node_modules/better-sqlite3/package.json"
cp "$ROOT/theia/node_modules/better-sqlite3/prebuilds/linux-x64.node" "$STAGE/theia/node_modules/better-sqlite3/prebuilds/linux-x64.node"
tar -xJf "$ARCHIVE" -C "$STAGE/node" --strip-components=1 "node-$NODE_VERSION-linux-x64/bin/node" "node-$NODE_VERSION-linux-x64/LICENSE"
test "$("$STAGE/node/bin/node" --version)" = "$NODE_VERSION" || fail "the staged node does not report $NODE_VERSION"
cp "$ROOT/powerbrowser/distribution/policies.json" "$STAGE/distribution/policies.json"
( cd "$STAGE" && python3 "$ROOT/upstream/config/createprecomplete.py" )

shopt -s nullglob
TARBALLS=( "$OBJ/dist"/*-"$VERSION".en-US.linux-x86_64.tar.xz )
shopt -u nullglob
test ${#TARBALLS[@]} -eq 1 || fail "expected exactly one $OBJ/dist/*-$VERSION.en-US.linux-x86_64.tar.xz, found ${#TARBALLS[@]}"
TARBALL="${TARBALLS[0]}"
tar --sort=name -C "$OBJ/dist" -cJf "$TARBALL.tmp" "$(basename "$STAGE")"
mv "$TARBALL.tmp" "$TARBALL"
trap - ERR
echo "package-linux: wrote $TARBALL"
