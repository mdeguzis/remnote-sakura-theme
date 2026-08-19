# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-08-19

### Fixed

- The artwork no longer paints over the interface. The branch layers are fixed
  at z-index 0, which puts them above every element in the page that is not
  positioned, so blossoms sat across the document title, the tab strip and the
  card being reviewed in the flashcard queue. `#main` wraps everything RemNote
  renders and now carries a positive z-index, which lifts the whole interface
  over the layer in one move.

  Two backgrounds had to come off for the branches to still read underneath:
  RemNote's boot script sets an opaque `#181820` inline on `body`, and
  `#content` carried a second page wash over the gradient that is already on
  `html`.

- The flashcard queue is themed. Almost none of it went through RemNote's
  colour tokens: the card counter, the corner buttons and the progress groove
  use raw grey utilities, the queue backdrop is an inverse surface, and its
  wrapper uses a Tailwind `dark:` variant that outranks every single class rule
  in the stylesheet. The card is drawn near opaque with a palette border, which
  is what separates it from a pale page in light mode.

- The PDF reader is themed. Its workspace is painted with hard coded Tailwind
  colours rather than tokens, so the reading area stayed slate grey with the
  theme running around the outside of it. The pages themselves are left alone:
  that is the document, not chrome.

- Dark mode surfaces built on the elevation tokens now change colour at all.
  RemNote paints those as gradients, which are background images, so setting
  only a background colour left its grey on top of the theme's.

- The tab bar and the document sidebar are themed. Both carry an inline
  background, which is the one thing a stylesheet cannot outrank on specificity.

### Changed

- The tab strip and the breadcrumb bar are drawn near opaque. Everywhere else a
  branch behind a translucent surface is the point; behind small text you have
  to read it is noise.

## [1.2.1] - 2026-08-16

### Fixed

- A development build now installs as `sakura-theme-dev` rather than colliding
  with an installed release. RemNote keys plugins by manifest id and refuses a
  second one with an id it already has: "A plugin with the ID 'sakura-theme' is
  already installed." That left anyone running the released plugin unable to
  load the dev server without uninstalling it first, which is exactly when
  having both is most useful.

  webpack rewrites the id and name on the way into the bundle, so the checked in
  manifest keeps the real id and no build step has to remember to undo the
  suffix. A test fails if a `-dev` id ever reaches the source manifest.

## [1.2.0] - 2026-08-16

### Added

- A **Tint strength** setting, 0 to 200, for anyone who finds the palettes too
  pale. 100 is each shade exactly as designed; higher deepens the ground, lower
  washes it toward neutral.

  Only the grounds and surfaces move. Text, accent, border and the artwork
  colours stay where they were, because text has to hold still for the contrast
  floor to mean anything, and shifting wood or blossom would change what the
  tree is made of rather than what it stands on. Panels take the colour shift
  but only a third of the lightness shift, since they carry the most text.

  The range stops at 200 because that is where the 4.5:1 floor still holds on
  every shade. The contrast tests now walk the whole range in steps of ten
  rather than checking the authored values alone.

## [1.1.2] - 2026-08-15

### Fixed

- The plugin zip now includes `theme.css`, without which RemNote refuses the
  upload: "Theme plugins must include a theme.css file." Declaring
  `"theme": ["light", "dark"]` classifies the plugin as a theme, and a theme
  plugin must carry that file even when its CSS is applied through
  `registerCSS`. The requirement is not in the submission documentation.

  The file is empty on purpose. The stylesheet is composed at runtime because it
  changes with the settings, and shipping the defaults here as well would mean
  two copies of the theme competing for the same surfaces.

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
