# Chrome Bar & Navigation

## Design Decisions

- The browser toolbar is the **chrome bar**: back/forward/reload,
  address input, new tab, mode toggle. It lives as a toolbar-like
  contribution above or below the Theia toolbar (sketch 001 winner:
  Variant A top bar — tab strip on top, nav row beneath,
  Firefox-like). It won as path of least resistance: existing Theia
  tab bars plus a toolbar contribution.
- Naming is fixed: "chrome bar" everywhere, never "browser toolbar".
- MVP chrome is tab feel + navigation only. Explicitly out:
  bookmarks strip, per-tab close buttons, browser menu.

## CSS Patterns

- DarkIDE-consistent surfaces: `var(--color-bg)` window,
  `var(--color-surface)` bars, `var(--color-border)` hairlines,
  `var(--color-text)` / `var(--color-text-muted)` ink,
  `var(--color-primary)` accent. Full vocabulary in
  `sources/themes/default.css`.
- Pill address bar: `border-radius: var(--radius-full)` on a surface
  fill with hairline border; lock glyph green.
- Tab strip: text tabs with top rounding only in browser position;
  hover lifts to `--color-surface-raised`; active tab matches the
  content background with a hairline border.
- Baseline motion: `transition: all 0.15s ease` on every interactive
  element.

## HTML Structures

- Mock window order: menubar → tabstrip → navbar (chrome bar) →
  workarea (side panel + content) → status bar.
- Suggestion dropdown lives inside the address pill, absolutely
  positioned below the input.
- Tab-count chip in the status bar asserts the tabs invariant.

## What to Avoid

- Floating address bar (001-B): most content space but hides
  navigation; rejected for MVP.
- Vertical side strip (001-C): titles never truncate but fights
  Theia's horizontal shell regions; rejected for MVP.
- Inventing a brand hue: neutrals + one restrained blue only.

## Origin
Synthesized from sketches: 001
Source files available in: sources/001-browser-chrome-placement/
