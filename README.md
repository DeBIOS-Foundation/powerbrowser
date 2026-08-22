# Power Browser

A Firefox ESR fork that hosts Eclipse Theia as its interface. The browser boots,
supervises a bundled Theia backend on localhost, and presents the IDE as the
GUI. Web pages and editors run in the same application, on a real browser
engine.

The substrate is Firefox, not Electron, because the point is to have a **whole
browser** — not a browser-shaped shell around an editor. Everything a real
browser does, it does: DRM and streaming, the full WebExtensions API, per-site
process isolation, Mozilla's security patch stream. An Electron app can imitate
none of that.

## What this repo is

Power Browser is a **platform**, and it is deliberately agnostic. It has no
opinion about how you should code — no bundled database, no curated extension
set, no workflow baked in, no branding beyond a neutral default. It ships that
way on purpose, so anyone can remake it into the environment they actually
want.

Distributions are built on top of it. [Sourcerer](https://github.com/DeBIOS-Foundation/sourcerer)
is the first one.

```
Firefox ESR + Eclipse Theia     upstream — consumed, never modified
            ↓
      Power Browser             this repo — the platform
            ↓
   Sourcerer, and others        distributions — add, never patch
```

## Rules we hold ourselves to

- **Gecko is never modified.** The fork is a patch set over a pinned ESR tag.
- **Theia core is never forked.** `@theia/*` are npm dependencies; everything we
  add is a Theia extension.
- **Downstreams add, never patch.** If a distribution needs to change a file in
  here, that is a bug in our boundary — the platform needs an extension point.

Keeping the patch stack small is what keeps upstream updates cheap: ESR rebases
roughly every four weeks, Theia upgrades by changing a version number.

## Rebranding

Anyone redistributing a Firefox fork **must** rebrand it — Mozilla's trademark
policy requires it. Power Browser is built so that renaming the product,
swapping icons, and repointing or disabling telemetry happen in one manifest.
See `docs/REBRANDING.md`.

## Status

Early. Nothing here is buildable yet. Firefox ESR 153, Theia 1.74.1, Linux
first.

---

A project of the [DeBIOS Foundation](https://github.com/DeBIOS-Foundation), a
501(c)(3) nonprofit.
