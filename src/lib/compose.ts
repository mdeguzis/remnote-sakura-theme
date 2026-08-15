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
 */
function assetVars(): string {
  return Object.entries(ASSETS)
    .map(([name, uri]) => `  --sakura-${name}: url("${uri}");`)
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

  const parts: string[] = [];

  parts.push(`/* Sakura for RemNote - shade: ${shade.name} */`);

  // Light is the base. RemNote adds a `dark` class to the root element, so the
  // dark block overrides it with a higher specificity selector.
  parts.push(`:root {\n${assetVars()}\n\n${paletteVars(shade.light)}\n
  --sakura-tree-opacity: ${TREE_OPACITY[options.trees]};
  --sakura-petal-opacity: ${tile.opacity};
  --sakura-petal-size-near: ${tile.near};
  --sakura-petal-size-far: ${tile.far};
  --sakura-petal-duration-near: ${duration.near}s;
  --sakura-petal-duration-far: ${duration.far}s;
}`);

  parts.push(`html.dark {\n${paletteVars(shade.dark)}\n}`);

  parts.push(CSS.base);

  // Omit the layers entirely when they are switched off, rather than shipping
  // them at zero opacity. A fixed, full viewport masked element still costs
  // compositing work even when it is invisible.
  if (options.trees !== 'off') {
    parts.push(CSS.trees);
  }
  if (options.petals) {
    parts.push(CSS.petals);
  }

  return parts.join('\n\n');
}
