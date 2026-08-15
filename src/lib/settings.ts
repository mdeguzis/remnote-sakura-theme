import type { RNPlugin } from '@remnote/plugin-sdk';

import { compose } from './compose.ts';
import { normalizeOptions, type PetalDensity, type PetalSpeed, type SakuraOptions, type TreeMode } from './options.ts';

/**
 * Setting ids.
 *
 * `codeOpacity` carries a version suffix on purpose. RemNote persists a setting
 * the first time it is seen and never re-applies `defaultValue`, so changing a
 * default in code reaches nobody who already has the plugin. A fresh id has
 * never been seen, so the current default takes effect. Bump the suffix
 * whenever a default has to reach existing installs.
 */
export const SETTINGS = {
  useDefaults: 'use-defaults',
  shade: 'shade',
  trees: 'trees',
  scenery: 'scenery',
  codeOpacity: 'panel-opacity-v4',
  petals: 'petals',
  petalDensity: 'petal-density',
  petalSpeed: 'petal-speed',
} as const;

/**
 * Read every setting and coerce it into usable options.
 *
 * One shared reader for the tracker, the commands and the debug widget. Three
 * copies of this would eventually disagree about what is actually in effect,
 * which is precisely the question these exist to answer.
 */
export async function readOptions(plugin: RNPlugin): Promise<SakuraOptions> {
  return normalizeOptions({
    useDefaults: await plugin.settings.getSetting<boolean>(SETTINGS.useDefaults),
    shade: await plugin.settings.getSetting<string>(SETTINGS.shade),
    trees: await plugin.settings.getSetting<TreeMode>(SETTINGS.trees),
    scenery: await plugin.settings.getSetting<boolean>(SETTINGS.scenery),
    codeOpacity: await plugin.settings.getSetting<number>(SETTINGS.codeOpacity),
    petals: await plugin.settings.getSetting<boolean>(SETTINGS.petals),
    petalDensity: await plugin.settings.getSetting<PetalDensity>(SETTINGS.petalDensity),
    petalSpeed: await plugin.settings.getSetting<PetalSpeed>(SETTINGS.petalSpeed),
  });
}

/**
 * A report worth pasting into a bug thread.
 *
 * Includes the emitted CSS variables, not just the option values. The gap
 * between "the setting says 0" and "the stylesheet says 0" is where these bugs
 * actually live, and only showing the options hides exactly that.
 */
export function buildDebugReport(options: SakuraOptions): string {
  const css = compose(options);

  const codeVars = (css.match(/--sakura-code-[\w-]+: [^;]+;/g) || []).map((line) => `  ${line}`).join('\n');
  const layerVars = (css.match(/--sakura-(?:tree|petal)-[\w-]+: [^;]+;/g) || [])
    .map((line) => `  ${line}`)
    .join('\n');

  // Which decorative layers were actually emitted, as opposed to requested.
  const emitted = [
    css.includes('html::before') ? 'branch layer' : null,
    css.includes('@keyframes sakura-fall-near') ? 'petal layer' : null,
    css.includes('--sakura-scenery-shop-structure: url(') ? 'shop' : null,
  ].filter(Boolean);

  return [
    '--- sakura debug ---',
    `options:      ${JSON.stringify(options)}`,
    `css bytes:    ${css.length}`,
    `emitted:      ${emitted.join(', ') || 'none'}`,
    '',
    'code block variables:',
    codeVars || '  (none emitted)',
    '',
    'layer variables:',
    layerVars || '  (none emitted)',
    '',
    `platform:     ${typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent}`,
    '--- end ---',
  ].join('\n');
}
