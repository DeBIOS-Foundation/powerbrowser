---
name: sketch-findings-Power-Browser
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-loaded during UI implementation on Power-Browser.
---

<context>
## Project: Power-Browser

Quiet Firefox-fresh dark, IDE-consistent: deep dark surfaces, muted
secondary text, one restrained blue accent. Browser chrome reads as a
native Theia citizen, not a skinned-on browser. Dense but calm.
Reference points: Firefox tab strip + address bar (tab feel,
tear-off, tiles page); Theia shell regions as the
path-of-least-resistance constraint.

Sketch sessions wrapped: 2026-09-06
</context>

<design_direction>
## Overall Direction

Top chrome bar (Variant A), mode-driven shell with relocating tab
strip (Variant B), Panorama canvas for organising. Palette:
neutrals + one blue; type: system sans + mono URIs; spacing: 4px
base scale; motion baseline 0.15s ease. Tabs persist across every
mode; modes are customizable data over shipped defaults.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Chrome bar & navigation | references/chrome-bar-and-navigation.md | Top-bar chrome bar (001-A); tab feel + navigation MVP |
| Modes, tabs & organising | references/modes-tabs-and-organising.md | Strip relocates per mode (002-B); Panorama canvas + tree toggle |

## Theme

The winning theme file is at `sources/themes/default.css`.

## Source Files

Original sketch HTML files are preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Sketches

- 001-browser-chrome-placement
- 002-mode-toggle-tabs
</metadata>
