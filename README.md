# Sakura for RemNote

A cherry blossom theme. Branches grow in from the edges of the window and the interface sits translucent on top of them, so the tree is part of the app rather than a picture behind it.

Four shades, adjustable branches, and falling petals you can turn on.

## Two ways to install

RemNote themes cannot contain JavaScript, which means a theme cannot offer settings. So this ships twice, from the same CSS:

| | Where it goes | What you get |
| --- | --- | --- |
| **SakuraTheme.zip** | Settings, Themes, Build, Upload theme | The Hanami shade with branches on and petals off |
| **SakuraPlugin.zip** | Settings, Plugins, Build, Upload plugin | The same theme plus settings for shade, branches and petals |

Install the plugin if you want the switches. Install the theme if you want one look and nothing to configure.

Build them with `npm install && npm run build`.

## Shades

Each shade carries its own light and dark palette and follows RemNote's Light / Dark / System setting under Settings, Interface.

The dark palettes are deliberately not near black. A cherry theme that drops to charcoal at night keeps the branches but loses the reason for them, so these grounds hold their plum, indigo and ember instead. That spends some contrast against pure black, so what remains is measured rather than eyeballed: `tests/contrast.test.mjs` puts a WCAG floor under body text, muted text, panel text and the accent, in every shade and both modes.

| Shade | |
| --- | --- |
| **Hanami** | Pale blush under an overcast spring sky. The default. |
| **Yozakura** | Night blossoms. Deep indigo and plum with lantern pink. |
| **Yuzakura** | Evening bloom. Warm coral and peach at golden hour. |
| **Shirayuki** | Almost white. Blossoms barely tinted, for reading all day. |

## Settings

Only in the plugin build. Settings, Plugins, Sakura.

| Setting | Options | Default |
| --- | --- | --- |
| Shade | Hanami, Yozakura, Yuzakura, Shirayuki | Hanami |
| Blossom branches | Off, Subtle, Normal, Bold | Bold |
| Corner shop | On, Off | On |
| Panel opacity | 0 to 100 | 75 |
| Falling petals | On, Off | **Off** |
| Petal density | Sparse, Gentle, Heavy | Gentle |
| Petal speed | Slow, Drifting, Brisk | Drifting |

Panel opacity controls how solid the inset surfaces are: code blocks, the editor container, and anything else RemNote insets. It drives `--current-background-color`, which is the variable RemNote actually paints those with.

At 0 the panel disappears and content sits directly on the scenery. At 100 it is solid and hides the artwork behind it. In between is a frosted panel, which is where the default sits. Lower it to see more of the branches and the shop, raise it for flatter and easier reading.

Petals are off by default. Continuous motion behind text is charming for a day and irritating by the third, so you opt in. If your system asks for reduced motion the petals stay visible but stop moving, even when you have turned them on.

## How the branches work

The branches are CSS masks, not background images. A mask takes its color from the element underneath it, and that is the only way one set of drawings can serve four shades: an SVG inside a data URI is a separate document, so it cannot read `currentColor` or the page's custom properties. Wood and blossoms are separate files because a mask layer can only be one color.

Everything is embedded in the stylesheet. There are no remote requests, so nothing here knows when you are using RemNote and it all works offline.

Surfaces are drawn at partial alpha so the branches read through them, with the alpha chosen per surface:

- page level surfaces sit around 0.62 to 0.78, where the branch is clearly visible
- menus and dialogs sit around 0.94 to 0.97 with a backdrop blur, because they have to stay readable over a dense cluster of blossoms
- text is never transparent

The decorative layers are `position: fixed` with `pointer-events: none`, so they can never take a click or scroll with the page.

## Development

Needs Node 24 or newer: the tests import TypeScript directly.

```bash
npm install
npm run preview   # writes build/preview.html
```

The preview is a standalone page that mocks the RemNote surfaces this theme touches, using the real class names and the real composed CSS. It has controls for every shade and option plus a dark mode toggle, so you can judge a color in a browser refresh instead of reloading RemNote. It cannot prove a selector matches something in the real app, which is what testing in RemNote is for.

To work against RemNote itself:

```bash
npm run dev
```

Then Settings, Plugins, Build, Develop from localhost, and enter `http://localhost:8080`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run preview` | Build the standalone preview page |
| `npm run dev` | Live server on port 8080 for Develop from localhost |
| `npm run dev:lan` | Same, reachable from another device on your network |
| `npm run art` | Regenerate the branch artwork and the icon |
| `npm run sources` | Inline `assets/` and `src/css/` into the importable modules |
| `npm test` | Full test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:compose` | Only the option and stylesheet composition tests |
| `npm run test:css` | Only the CSS integrity tests |
| `npm run test:art` | Only the artwork tests |
| `npm run check-types` | TypeScript type check |
| `npm run verify` | Type check and test. Run before pushing |
| `npm run build:theme` | `SakuraTheme.zip` for the theme marketplace |
| `npm run build:plugin` | `SakuraPlugin.zip` for the plugin marketplace |
| `npm run build` | Both |
| `npm run clean` | Remove build output and generated modules |

### Layout

```
assets/            Branch and petal masks, generated by scripts/gen-art.mjs
assets/icon/       Marketplace icon source
src/css/           The stylesheet, as plain CSS fragments
src/lib/palettes   The shades, as data
src/lib/compose    Options in, finished stylesheet out
src/widgets/       The plugin, which is settings plus a call to registerCSS
scripts/           Art generation and the two builds
```

`compose()` is the single source of truth. The theme build calls it once with fixed options and writes a static file; the plugin calls it again on every settings change. One function means the two artifacts cannot drift apart.

The artwork is grown from a seeded recursive rule rather than drawn by hand, so it is deterministic: regenerating produces byte identical files. Tune the shape by changing a number in `scripts/gen-art.mjs` and run `npm run art`.

## Versioning

Every change that ships bumps the version, including fixes and internal work.
That is deliberately stricter than the usual convention of bumping only on
user-facing releases: a build here can be identified by its version alone, which
matters when the thing being debugged is a stylesheet someone pasted three
builds ago.

`package.json` is the source of truth. The theme manifest is generated from it;
the plugin manifest in `public/` is written by hand, and a test asserts the two
agree and that the changelog has an entry for the current version.

## Credits

Class names and design tokens come from RemNote's [Custom CSS documentation](https://plugins.remnote.com/custom-css).

## License

MIT. See [LICENSE](LICENSE).
