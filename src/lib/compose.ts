/**
 * Turn a set of options into the finished stylesheet.
 *
 * This is the single source of truth for the CSS. Both builds call it:
 *
 *   the theme zip   calls it once at build time with fixed options, because a
 *                   RemNote theme cannot contain JavaScript
 *   the plugin      calls it again on every settings change and hands the
 *                   result to plugin.app.registerCSS
 *
 * Keeping one function means the two artifacts cannot drift apart.
 */

import { ASSETS } from './assets.generated.ts';
import { CSS } from './css.generated.ts';
import { findShade, DEFAULT_SHADE, withTintStrength, type Palette } from './palettes.ts';
import {
  PETAL_DURATION,
  PETAL_TILE,
  TREE_OPACITY,
  normalizeOptions,
  type SakuraOptions,
} from './options.ts';
import { currentTimeZone, isSnowSeason } from './season.ts';

/**
 * Snow colour per mode, standing in for the shade's petal colour.
 *
 * Not white in light mode: every light shade is a pale ground, and white flakes
 * on it vanish. A cool grey blue reads as snow against blush and lavender alike.
 * Shared by every shade rather than tuned per palette, because snow is the one
 * thing in the picture that should not take the shade's colour.
 */
/**
 * How each season falls. Both fall straight down; `sway` is the wind's reach
 * either side, which is all the sideways movement there is. A slant would need
 * a rotated layer padded out to cover the window's corners, and that costs
 * compositor memory for as long as the app is open (see petals.css).
 *
 * Petals are tossed by gusts. Snow drifts straight down
 * on a calm wind: a slow, small, smooth sway, at periods in seconds that share
 * no factor with the fall so the swings never line up with it.
 *
 * `pace` scales the fall duration. Snow measured from a reference clip falls
 * at 5 to 29 vh/s; at the petal pace it managed 1 to 4 and read as floating.
 * 0.6 is about 1.6 times faster, kept well under the reference on purpose:
 * this falls behind the reader's notes, not across a title card.
 *
 * `opacityBoost` scales the density's layer opacity. Those opacities were tuned
 * for petals, which are large solid shapes; a field of small soft flakes at the
 * same opacity disappears into the ground.
 */
export const FALL = {
  petals: { sway: '1.2vw', wind: 'sakura-sway', windNear: 13, windFar: 19, opacityBoost: 1, pace: 1 },
  snow: { sway: '0.7vw', wind: 'sakura-sway-calm', windNear: 21, windFar: 29, opacityBoost: 1.9, pace: 0.6 },
} as const;

/** One decimal place, so a scaled duration does not print as 38.400000000000006. */
const r1 = (n: number) => Math.round(n * 10) / 10;

export const SNOW_COLOR = { light: '170, 188, 212', dark: '236, 240, 248' } as const;


/** Emit one palette's variables as declarations. */
function paletteVars(palette: Palette): string {
  return [
    `  --sakura-bg-top: ${palette.bgTop};`,
    `  --sakura-bg-bottom: ${palette.bgBottom};`,
    `  --sakura-surface: ${palette.surface};`,
    `  --sakura-elevated: ${palette.elevated};`,
    `  --sakura-text: ${palette.text};`,
    `  --sakura-text-muted: ${palette.textMuted};`,
    `  --sakura-accent: ${palette.accent};`,
    `  --sakura-accent-soft: ${palette.accentSoft};`,
    `  --sakura-border: ${palette.border};`,
    `  --sakura-wood: ${palette.wood};`,
    `  --sakura-blossom: ${palette.blossom};`,
    `  --sakura-petal: ${palette.petal};`,
  ].join('\n');
}

/**
 * The artwork, as data URI values.
 *
 * Declared once on :root so the mask rules can reference them by name and the
 * same URI is not repeated across the light and dark blocks.
 *
 * The branches and the corner shop share the same two mask layers, so neither
 * can be removed by dropping a rule the way the petal animation is. Instead a
 * switched off piece resolves to `none`, which is a valid value for one layer
 * of a multi-value mask and costs nothing to composite.
 */
function assetVars(options: SakuraOptions, snowing: boolean): string {
  return Object.entries(ASSETS)
    .filter(([name]) => !name.startsWith('snow-'))
    // Six falling tiles are a third of the stylesheet. With petals off nothing
    // references them, so they are not shipped.
    .filter(([name]) => options.petals || !name.startsWith('petals-'))
    .map(([name, uri]) => {
      // Snow is drawn by the petal layer under the petal variable names, so
      // petals.css never has to know which season it is. The snow tiles are
      // never declared under their own names: that would ship them all year.
      if (snowing && name.startsWith('petals-')) {
        const snowName = name.replace('petals-', 'snow-');
        const snowUri = ASSETS[snowName];
        if (!snowUri) throw new Error(`no ${snowName} asset to stand in for ${name}. Run "npm run art".`);
        uri = snowUri;
      }
      const isBranch = name.startsWith('branch-');
      const isScenery = name.startsWith('scenery-');
      const hidden = (isBranch && options.trees === 'off') || (isScenery && !options.scenery);
      return `  --sakura-${name}: ${hidden ? 'none' : `url("${uri}")`};`;
    })
    .join('\n');
}

/**
 * Whether code panels blur what is behind them.
 *
 * Not at 0, where there is no panel and a blur would leave the artwork sharp
 * outside the block and soft inside. And not from 90 up, where so little shows
 * through that the blur cannot be seen. A backdrop blur is recomputed every
 * frame the page scrolls under the panel, so one that cannot be seen is pure
 * cost.
 */
export const CODE_BLUR_MAX_OPACITY = 89;
function codeBlurs(codeOpacity: number): boolean {
  return codeOpacity > 0 && codeOpacity <= CODE_BLUR_MAX_OPACITY;
}

/**
 * `now` and `timeZone` decide whether the petals fall as snow. They are
 * parameters rather than read inside so a test can pin the season.
 */
export function compose(
  rawOptions: Partial<SakuraOptions>,
  now: Date = new Date(),
  timeZone: string = currentTimeZone()
): string {
  const options = normalizeOptions(rawOptions);
  const shade = findShade(options.shade) ?? findShade(DEFAULT_SHADE);

  if (!shade) {
    // Unreachable unless the shade table is emptied, but returning a broken
    // stylesheet would be worse than a clear failure.
    throw new Error(`no shade found for "${options.shade}" and no default available`);
  }

  // Apply the tint strength ONCE, here, so every later reference to the palette
  // sees the adjusted colours. Applying it at each use site would be two
  // chances to forget one and ship a page whose light and dark blocks disagree.
  const snowing = options.petals && isSnowSeason(options.season, now, timeZone);
  const tintedLight = withTintStrength(shade.light, options.tintStrength);
  const tintedDark = withTintStrength(shade.dark, options.tintStrength);
  const light = snowing ? { ...tintedLight, petal: SNOW_COLOR.light } : tintedLight;
  const dark = snowing ? { ...tintedDark, petal: SNOW_COLOR.dark } : tintedDark;

  const tile = PETAL_TILE[options.petalDensity];
  const fall = snowing ? FALL.snow : FALL.petals;
  const duration = PETAL_DURATION[options.petalSpeed];

  // Branches and scenery are painted by the same two elements, and that element
  // carries one opacity. With branches off but scenery on, using the branch
  // opacity of zero would hide the shop too, so fall back to a visible value.
  const layerOpacity =
    options.trees === 'off' && options.scenery ? TREE_OPACITY.normal : TREE_OPACITY[options.trees];

  // The layer is only worth mounting if something is drawn on it.
  const showLayers = options.trees !== 'off' || options.scenery;

  const parts: string[] = [];

  parts.push(`/* Sakura for RemNote - shade: ${shade.name}${snowing ? ', snowing' : ''} */`);

  // Light is the base. RemNote adds a `dark` class to the root element, so the
  // dark block overrides it with a higher specificity selector.
  parts.push(`:root {\n${assetVars(options, snowing)}\n\n${paletteVars(light)}\n
  --sakura-tree-opacity: ${layerOpacity};
  --sakura-petal-opacity: ${Math.min(0.95, tile.opacity * fall.opacityBoost).toFixed(3)};
  --sakura-petal-size-near: ${tile.near};
  --sakura-petal-size-far: ${tile.far};
  --sakura-petal-duration-near: ${r1(duration.near * fall.pace)}s;
  --sakura-petal-duration-far: ${r1(duration.far * fall.pace)}s;
  --sakura-petal-sway: ${fall.sway};
  --sakura-petal-wind: ${fall.wind};
  --sakura-petal-wind-near: ${fall.windNear}s;
  --sakura-petal-wind-far: ${fall.windFar}s;
  --sakura-code-opacity: ${(options.codeOpacity / 100).toFixed(3)};
  --sakura-code-blur: ${codeBlurs(options.codeOpacity) ? 'blur(8px) saturate(115%)' : 'none'};
}`);

  // Dark mode has to land on the ROOT element, not on whichever element
  // RemNote happens to put its `dark` class on.
  //
  // Two selectors because RemNote's own docs demonstrate dark mode as
  // `.dark div { ... }`, a descendant selector, which means the class may sit
  // on a wrapper rather than on <html>. If it does, `html.dark` never matches
  // and every surface silently keeps the light palette.
  //
  // `html:has(.dark)` covers the wrapper case, and it has to hoist the values
  // to the root rather than styling the wrapper: custom properties declared on
  // a nested element cannot reach `html::before`, which is where the branches
  // are drawn. Declaring them on html means the pseudo-elements get them and
  // everything below inherits them.
  parts.push(`html.dark,\nhtml:has(.dark) {\n${paletteVars(dark)}\n}`);

  parts.push(CSS.base);

  // Omit the layers entirely when they are switched off, rather than shipping
  // them at zero opacity. A fixed, full viewport masked element still costs
  // compositing work even when it is invisible.
  if (showLayers) {
    parts.push(CSS.trees);
  }
  if (options.petals) {
    parts.push(CSS.petals);
  }

  return parts.join('\n\n');
}
