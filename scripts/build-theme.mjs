#!/usr/bin/env node
/**
 * Build the theme zip for the RemNote theme marketplace.
 *
 * A RemNote theme is `theme.css` + `manifest.json` + `README.md`, with no
 * JavaScript at all, so this bakes one set of options into a static stylesheet.
 * Which options get baked is the whole design question: the theme ships the
 * defaults, meaning branches on and petals off, because a static theme has no
 * way to offer a switch.
 *
 * Anyone who wants the switches installs the plugin build instead.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compose } from '../src/lib/compose.ts';
import { DEFAULT_OPTIONS } from '../src/lib/options.ts';
import { SHADES } from '../src/lib/palettes.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'theme');

/** The shade the static theme ships. */
const THEME_SHADE = process.env.SAKURA_SHADE || DEFAULT_OPTIONS.shade;

function readVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const [major, minor, patch] = pkg.version.split('.').map((n) => Number.parseInt(n, 10));

  if ([major, minor, patch].some((n) => !Number.isInteger(n))) {
    throw new Error(`package.json version "${pkg.version}" is not a plain semver triple`);
  }
  return { major, minor, patch };
}

function main() {
  const shade = SHADES.find((entry) => entry.id === THEME_SHADE);
  if (!shade) {
    throw new Error(`unknown shade "${THEME_SHADE}". Known: ${SHADES.map((s) => s.id).join(', ')}`);
  }

  const css = compose({ ...DEFAULT_OPTIONS, shade: shade.id });

  const manifest = {
    manifestVersion: 1,
    id: 'sakura',
    name: `Sakura (${shade.name})`,
    author: 'mdeguzis',
    description: `${shade.description} Cherry blossom branches behind a translucent interface.`,
    repoUrl: 'https://github.com/mdeguzis/remnote-sakura-theme',
    version: readVersion(),
    // Both palettes are in the stylesheet, gated on RemNote's dark class.
    theme: ['light', 'dark'],
    enableOnMobile: true,
    requestNative: false,
    requiredScopes: [],
  };

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  fs.writeFileSync(path.join(OUT, 'theme.css'), css, 'utf8');
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(OUT, 'README.md'));
  fs.copyFileSync(path.join(ROOT, 'public', 'logo.png'), path.join(OUT, 'logo.png'));

  console.log(
    `[build-theme] shade=${shade.id} css=${Buffer.byteLength(css, 'utf8')} bytes -> ${path.relative(ROOT, OUT)}`
  );
}

main();
