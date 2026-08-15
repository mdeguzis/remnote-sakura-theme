# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-15

First stable release. Every version from here bumps on any change that ships,
including fixes and internal work, so a build can always be identified by its
version alone.

### Added

- Panel opacity setting, driving `--current-background-color`, which is what
  RemNote actually paints code blocks and the editor container with
- Use defaults setting at the top of the panel. RemNote's API cannot write a
  setting, so this ignores stored values rather than erasing them
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
