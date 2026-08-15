import { declareIndexPlugin, ReactRNPlugin } from '@remnote/plugin-sdk';

import { compose } from '../lib/compose.ts';
import { SHADES } from '../lib/palettes.ts';
import {
  DEFAULT_OPTIONS,
  PETAL_DENSITIES,
  PETAL_SPEEDS,
  TREE_MODES,
  normalizeOptions,
  type PetalDensity,
  type PetalSpeed,
  type TreeMode,
} from '../lib/options.ts';

const LOG_PREFIX = '[sakura]';

/** The registerCSS id this plugin owns. Re-registering it replaces the sheet. */
const CSS_KEY = 'sakura-theme';

const SETTINGS = {
  shade: 'shade',
  trees: 'trees',
  scenery: 'scenery',
  petals: 'petals',
  /*
   * Deliberately versioned.
   *
   * RemNote persists a setting the first time it is seen, and defaultValue
   * never applies again. Anyone who installed while the default was 55 kept 55
   * through every rebuild, so changing the default in code reached nobody and
   * the artifact it was meant to remove stayed on screen.
   *
   * A new id has never been seen, so the current default takes effect. Bump
   * this suffix whenever a default has to reach existing installs.
   */
  codeOpacity: 'code-opacity-v2',
  petalDensity: 'petal-density',
  petalSpeed: 'petal-speed',
} as const;

const TREE_LABELS: Record<TreeMode, string> = {
  off: 'Off',
  subtle: 'Subtle',
  normal: 'Normal',
  bold: 'Bold',
};

const DENSITY_LABELS: Record<PetalDensity, string> = {
  sparse: 'Sparse',
  gentle: 'Gentle',
  heavy: 'Heavy',
};

const SPEED_LABELS: Record<PetalSpeed, string> = {
  slow: 'Slow',
  drifting: 'Drifting',
  brisk: 'Brisk',
};

/**
 * Read every setting and coerce it into usable options.
 *
 * Shared by the tracker and the reporting command so the two cannot disagree
 * about what is actually in effect.
 */
async function readOptions(plugin: ReactRNPlugin) {
  return normalizeOptions({
    shade: await plugin.settings.getSetting<string>(SETTINGS.shade),
    trees: await plugin.settings.getSetting<TreeMode>(SETTINGS.trees),
    scenery: await plugin.settings.getSetting<boolean>(SETTINGS.scenery),
    codeOpacity: await plugin.settings.getSetting<number>(SETTINGS.codeOpacity),
    petals: await plugin.settings.getSetting<boolean>(SETTINGS.petals),
    petalDensity: await plugin.settings.getSetting<PetalDensity>(SETTINGS.petalDensity),
    petalSpeed: await plugin.settings.getSetting<PetalSpeed>(SETTINGS.petalSpeed),
  });
}

async function onActivate(plugin: ReactRNPlugin) {
  try {
    await registerEverything(plugin);
  } catch (error) {
    // A throw here leaves the plugin loaded but inert, with nothing in the UI
    // to say why. Borrowed from catppuccin/remnote, which does the same.
    console.error(`${LOG_PREFIX} activation failed`, error);
    await plugin.app.toast('Sakura failed to start. See the developer console for details.');
  }
}

async function registerEverything(plugin: ReactRNPlugin) {
  await plugin.settings.registerDropdownSetting({
    id: SETTINGS.shade,
    title: 'Shade',
    description: 'Which sakura palette to use. Each one carries its own light and dark mode.',
    defaultValue: DEFAULT_OPTIONS.shade,
    options: SHADES.map((shade) => ({
      key: shade.id,
      label: `${shade.name} - ${shade.description}`,
      value: shade.id,
    })),
  });

  await plugin.settings.registerDropdownSetting({
    id: SETTINGS.trees,
    title: 'Blossom branches',
    description: 'How strongly the cherry branches show behind the interface.',
    defaultValue: DEFAULT_OPTIONS.trees,
    options: TREE_MODES.map((mode) => ({ key: mode, label: TREE_LABELS[mode], value: mode })),
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTINGS.scenery,
    title: 'Corner shop',
    description: 'A small shop with a cat sitting outside, in the bottom right corner.',
    defaultValue: DEFAULT_OPTIONS.scenery,
  });

  await plugin.settings.registerNumberSetting({
    id: SETTINGS.codeOpacity,
    title: 'Code block opacity',
    description:
      'How solid code blocks are, from 0 to 100. Lower lets more of the scenery through behind them, higher keeps code easier to read. 80 is the default.',
    defaultValue: DEFAULT_OPTIONS.codeOpacity,
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTINGS.petals,
    title: 'Falling petals',
    description:
      'Drift petals across the window. Off by default, and it holds still if your system asks for reduced motion.',
    defaultValue: DEFAULT_OPTIONS.petals,
  });

  await plugin.settings.registerDropdownSetting({
    id: SETTINGS.petalDensity,
    title: 'Petal density',
    description: 'How many petals are on screen. Only applies when falling petals are on.',
    defaultValue: DEFAULT_OPTIONS.petalDensity,
    options: PETAL_DENSITIES.map((density) => ({
      key: density,
      label: DENSITY_LABELS[density],
      value: density,
    })),
  });

  await plugin.settings.registerDropdownSetting({
    id: SETTINGS.petalSpeed,
    title: 'Petal speed',
    description: 'How fast petals fall. Only applies when falling petals are on.',
    defaultValue: DEFAULT_OPTIONS.petalSpeed,
    options: PETAL_SPEEDS.map((speed) => ({ key: speed, label: SPEED_LABELS[speed], value: speed })),
  });

  // Re-runs whenever any of these settings changes, which is what makes the
  // dropdowns feel live rather than needing a reload.
  plugin.track(async (reactivePlugin) => {
    const options = await readOptions(reactivePlugin as ReactRNPlugin);

    const css = compose(options);
    await reactivePlugin.app.registerCSS(CSS_KEY, css);

    console.debug(`${LOG_PREFIX} applied stylesheet`, {
      shade: options.shade,
      trees: options.trees,
      scenery: options.scenery,
      codeOpacity: options.codeOpacity,
      petals: options.petals,
      petalDensity: options.petalDensity,
      petalSpeed: options.petalSpeed,
      cssBytes: css.length,
      source: 'settings.getSetting',
      cssKey: CSS_KEY,
    });
  });

  await plugin.app.registerCommand({
    id: 'sakura-show-settings',
    name: 'Sakura: Show current settings',
    description: 'Report the values actually in use, for when the theme does not look like the settings say it should',
    action: async () => {
      // Settings persist independently of the code's defaults, so what is
      // stored and what the source says are not the same question. This
      // reports the former without needing the developer console.
      const options = await readOptions(plugin);
      const summary =
        `shade ${options.shade} | branches ${options.trees} | shop ${options.scenery ? 'on' : 'off'} | ` +
        `code ${options.codeOpacity} | petals ${options.petals ? options.petalDensity : 'off'}`;
      await plugin.app.toast(summary);
      console.debug(`${LOG_PREFIX} current settings`, options);
    },
  });

  await plugin.app.registerCommand({
    id: 'sakura-toggle-petals',
    name: 'Sakura: Toggle falling petals',
    description: 'Turn the drifting petals on or off',
    action: async () => {
      // Settings are read only from the API, so this reports where the control
      // lives rather than pretending to flip it.
      const petals = await plugin.settings.getSetting<boolean>(SETTINGS.petals);
      await plugin.app.toast(
        petals
          ? 'Petals are on. Turn them off in Settings, Plugins, Sakura.'
          : 'Petals are off. Turn them on in Settings, Plugins, Sakura.'
      );
      console.debug(`${LOG_PREFIX} petal toggle command`, { petals, source: 'command' });
    },
  });

  console.debug(`${LOG_PREFIX} activated`, { shades: SHADES.map((s) => s.id) });
}

/**
 * Clear the stylesheet on deactivate.
 *
 * Without this the theme stays applied after the plugin is disabled, which
 * reads as a broken app rather than a disabled plugin.
 */
async function onDeactivate(plugin: ReactRNPlugin) {
  await plugin.app.registerCSS(CSS_KEY, '');
  console.debug(`${LOG_PREFIX} deactivated, cleared css`, { cssKey: CSS_KEY });
}

declareIndexPlugin(onActivate, onDeactivate);
