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
import { findShade, DEFAULT_SHADE, type Palette } from './palettes.ts';
import {
  PETAL_DURATION,
  PETAL_TILE,
  TREE_OPACITY,
  normalizeOptions,
  type SakuraOptions,
} from './options.ts';


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
function assetVars(options: SakuraOptions): string {
  return Object.entries(ASSETS)
    .map(([name, uri]) => {
      const isBranch = name.startsWith('branch-');
      const isScenery = name.startsWith('scenery-');
      const hidden = (isBranch && options.trees === 'off') || (isScenery && !options.scenery);
      return `  --sakura-${name}: ${hidden ? 'none' : `url("${uri}")`};`;
    })
    .join('\n');
}

export function compose(rawOptions: Partial<SakuraOptions>): string {
  const options = normalizeOptions(rawOptions);
  const shade = findShade(options.shade) ?? findShade(DEFAULT_SHADE);

  if (!shade) {
    // Unreachable unless the shade table is emptied, but returning a broken
    // stylesheet would be worse than a clear failure.
    throw new Error(`no shade found for "${options.shade}" and no default available`);
  }

  const tile = PETAL_TILE[options.petalDensity];
  const duration = PETAL_DURATION[options.petalSpeed];

  // Branches and scenery are painted by the same two elements, and that element
  // carries one opacity. With branches off but scenery on, using the branch
  // opacity of zero would hide the shop too, so fall back to a visible value.
  const layerOpacity =
    options.trees === 'off' && options.scenery ? TREE_OPACITY.normal : TREE_OPACITY[options.trees];

  // The layer is only worth mounting if something is drawn on it.
  const showLayers = options.trees !== 'off' || options.scenery;

  const parts: string[] = [];

  parts.push(`/* Sakura for RemNote - shade: ${shade.name} */`);

  // Light is the base. RemNote adds a `dark` class to the root element, so the
  // dark block overrides it with a higher specificity selector.
  parts.push(`:root {\n${assetVars(options)}\n\n${paletteVars(shade.light)}\n
  --sakura-tree-opacity: ${layerOpacity};
  --sakura-petal-opacity: ${tile.opacity};
  --sakura-petal-size-near: ${tile.near};
  --sakura-petal-size-far: ${tile.far};
  --sakura-petal-duration-near: ${duration.near}s;
  --sakura-petal-duration-far: ${duration.far}s;
  --sakura-code-opacity: ${(options.codeOpacity / 100).toFixed(3)};
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
  parts.push(`html.dark,\nhtml:has(.dark) {\n${paletteVars(shade.dark)}\n}`);

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
