# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
