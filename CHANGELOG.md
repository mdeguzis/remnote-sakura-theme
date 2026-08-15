# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-08-15

### Fixed

- Panel opacity now reaches the editor container. A leftover rule forced
  `.EditorContainer` to `transparent`, which overrode
  `--current-background-color` and meant the setting could not affect that
  surface whatever it was set to.

### Removed

- Dead CSS from the search for the element that was covering the artwork: an
  `!important`, a `:has()` rule guessing at a code block wrapper class, and a
  set of CodeMirror background selectors. All three targeted elements that were
  never painting the background. Roughly 2.6 KB of the stylesheet.

  The CodeMirror scrollbar rules stay: those were verified against a real
  element and do work.

## [1.1.0] - 2026-08-15

### Removed

- The Use defaults switch. It was added as a stand-in for a reset button, but
  RemNote's API cannot write a setting, so it could only ignore stored values
  rather than restore them. A control whose name promises more than it does is
  worse than no control, and the settings panel is better without it.

  To get the defaults back, change the settings by hand, or reinstall the plugin
  so the stored values are gone and the defaults apply again.

Minor rather than patch because it changes the settings surface.

## [1.0.0] - 2026-08-15

First stable release. Every version from here bumps on any change that ships,
including fixes and internal work, so a build can always be identified by its
version alone.

### Added

- Panel opacity setting, driving `--current-background-color`, which is what
  RemNote actually paints code blocks and the editor container with
- Show debug info command, opening a copyable report of the options in effect
  and the CSS variables actually emitted
- Show current settings and Copy debug info commands in the omnibar

### Fixed

- Theme RemNote's design tokens rather than only its classes. The tokens are
  custom properties as well, and the variables are what reach internal elements
  carrying no documented class
- Dark mode applies when RemNote puts its dark class on a wrapper rather than
  on the root element
- Petals no longer jump at the end of each loop; both axes now land on whole
  tiles
- Scenery fades as one object under a translucent panel, instead of the lit
  detail surviving alone
- Scrollbars no longer draw a saturated stripe down every scrollable edge
- `npm run dev` frees its own previous port and rebuilds artwork and CSS on
  change, without looping

## [0.1.0] - 2026-08-14

First release.

### Added

- Cherry blossom branches rendered as CSS masks, so one set of drawings serves every shade
- Four shades, each with a light and a dark palette: Hanami, Yozakura, Yuzakura, Shirayuki
- Translucent surfaces tuned per layer, so branches read through the page while menus stay legible
- Falling petals as two drifting mask layers, off by default and held still under reduced motion
- Plugin settings for shade, branch strength, petals, petal density and petal speed
- Two build targets from one CSS source: a static theme zip and a plugin zip with settings
- Procedural artwork generation with a seeded PRNG, so rebuilds are byte identical
- Standalone preview page mocking the RemNote surfaces the theme touches
