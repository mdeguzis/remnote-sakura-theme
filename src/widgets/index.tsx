import { declareIndexPlugin, ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';

import { compose } from '../lib/compose.ts';
import { SHADES } from '../lib/palettes.ts';
import { SETTINGS, readOptions } from '../lib/settings.ts';
import { SEASONS, currentTimeZone, isSnowSeason, type Season } from '../lib/season.ts';
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

const SEASON_LABELS: Record<Season, string> = {
  auto: 'Automatic, from your time zone',
  northern: 'Automatic, northern hemisphere (snow December to February)',
  southern: 'Automatic, southern hemisphere (snow June to August)',
  spring: 'Always spring, petals all year',
  winter: 'Always winter, snow all year',
};

/**
 * How often to check whether the season has turned.
 *
 * The tracker only re-runs on a settings change, so an app left open across
 * the first of December would keep its petals until the next restart.
 */
const SEASON_CHECK_MS = 60 * 60 * 1000;
let seasonTimer: ReturnType<typeof setInterval> | undefined;

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
    title: 'Panel opacity',
    description:
      'How solid the inset panels are, from 0 to 100. Affects code blocks, the editor container and other surfaces RemNote insets. Lower lets more of the branches and the shop through, higher keeps text flatter and easier to read. 0 removes the panel entirely, 100 makes it solid. Default is 75.',
    defaultValue: DEFAULT_OPTIONS.codeOpacity,
  });

  await plugin.settings.registerNumberSetting({
    id: SETTINGS.tintStrength,
    title: 'Tint strength',
    description:
      'How strongly the shade colours the page, from 0 to 200. 100 is the shade as designed. Lower washes it toward neutral, higher deepens it if the blush feels too pale. Text colour does not move, so very high values trade away some contrast.',
    defaultValue: DEFAULT_OPTIONS.tintStrength,
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

  await plugin.settings.registerDropdownSetting({
    id: SETTINGS.season,
    title: 'Season',
    description:
      'Petals fall as snow in winter. Automatic follows the winter months where you are, guessing the hemisphere from your time zone, or you can pin one season for good. Only applies when falling petals are on.',
    defaultValue: DEFAULT_OPTIONS.season,
    options: SEASONS.map((season) => ({ key: season, label: SEASON_LABELS[season], value: season })),
  });

  let lastSnowing = false;

  // Re-runs whenever any of these settings changes, which is what makes the
  // dropdowns feel live rather than needing a reload.
  plugin.track(async (reactivePlugin) => {
    const options = await readOptions(reactivePlugin as ReactRNPlugin);

    const now = new Date();
    const timeZone = currentTimeZone();
    const css = compose(options, now, timeZone);
    await reactivePlugin.app.registerCSS(CSS_KEY, css);
    lastSnowing = options.petals && isSnowSeason(options.season, now, timeZone);

    console.debug(`${LOG_PREFIX} applied stylesheet`, {
      shade: options.shade,
      trees: options.trees,
      scenery: options.scenery,
      codeOpacity: options.codeOpacity,
      petals: options.petals,
      petalDensity: options.petalDensity,
      petalSpeed: options.petalSpeed,
      season: options.season,
      snowing: lastSnowing,
      timeZone,
      cssBytes: css.length,
      source: 'settings.getSetting',
      cssKey: CSS_KEY,
    });
  });

  // Only re-register when the season actually flipped, so an hourly tick
  // costs one settings read and nothing else on every other hour of the year.
  if (seasonTimer) clearInterval(seasonTimer);
  seasonTimer = setInterval(async () => {
    try {
      const options = await readOptions(plugin);
      const now = new Date();
      const timeZone = currentTimeZone();
      const snowing = options.petals && isSnowSeason(options.season, now, timeZone);
      if (snowing === lastSnowing) return;
      await plugin.app.registerCSS(CSS_KEY, compose(options, now, timeZone));
      console.info(`${LOG_PREFIX} season turned`, { snowing, was: lastSnowing, season: options.season, timeZone, month: now.getMonth() + 1 });
      lastSnowing = snowing;
    } catch (error) {
      console.error(`${LOG_PREFIX} season check failed`, { error, source: 'seasonTimer' });
    }
  }, SEASON_CHECK_MS);

  await plugin.app.registerWidget('debug_report', WidgetLocation.Popup, {
    dimensions: { height: 'auto', width: 560 },
  });

  await plugin.app.registerCommand({
    id: 'sakura-copy-debug',
    name: 'Sakura: Show debug info',
    description: 'Open a readable, copyable report of what the theme is actually doing',
    action: async () => {
      // A popup rather than a console dump. RemNote does not surface a
      // developer console, so writing there is the same as writing nowhere.
      await plugin.widget.openPopup('debug_report');
    },
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
        `code ${options.codeOpacity} | petals ${options.petals ? options.petalDensity : 'off'} | season ${options.season}`;
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
  if (seasonTimer) clearInterval(seasonTimer);
  seasonTimer = undefined;
  await plugin.app.registerCSS(CSS_KEY, '');
  console.debug(`${LOG_PREFIX} deactivated, cleared css`, { cssKey: CSS_KEY });
}

declareIndexPlugin(onActivate, onDeactivate);
