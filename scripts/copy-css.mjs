#!/usr/bin/env node
/**
 * Put theme.css on the clipboard.
 *
 * RemNote documents no way to test a theme locally: the theme flow goes
 * straight from writing CSS to uploading a zip. What it does document is
 * developing "inside RemNote by navigating to the Custom CSS powerup Rem and
 * clicking on the Add Blank CSS Block button", which applies styles live to
 * your own knowledge base and uploads nothing.
 *
 * That makes paste the actual dev loop for a theme, and theme.css is 44 KB, so
 * this saves opening the file and selecting all of it every iteration.
 *
 * Pass --plugin to copy the stylesheet the plugin build would produce for a
 * given set of options instead, for example:
 *   npm run css:copy -- --shade yozakura --petals
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { compose } from '../src/lib/compose.ts';
import { DEFAULT_OPTIONS, TREE_MODES, PETAL_DENSITIES, PETAL_SPEEDS } from '../src/lib/options.ts';
import { SHADES } from '../src/lib/palettes.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Clipboard commands to try, in order. Wayland first, then X11. */
const CLIPBOARDS = [
  ['wl-copy', []],
  ['xclip', ['-selection', 'clipboard']],
  ['pbcopy', []],
];

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  let fromFile = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (arg === '--shade') {
      if (!SHADES.some((shade) => shade.id === value)) {
        throw new Error(`unknown shade "${value}". Known: ${SHADES.map((s) => s.id).join(', ')}`);
      }
      options.shade = value;
      fromFile = false;
      i++;
    } else if (arg === '--trees') {
      if (!TREE_MODES.includes(value)) throw new Error(`--trees must be one of ${TREE_MODES.join(', ')}`);
      options.trees = value;
      fromFile = false;
      i++;
    } else if (arg === '--petals') {
      options.petals = true;
      fromFile = false;
    } else if (arg === '--density') {
      if (!PETAL_DENSITIES.includes(value)) throw new Error(`--density must be one of ${PETAL_DENSITIES.join(', ')}`);
      options.petalDensity = value;
      fromFile = false;
      i++;
    } else if (arg === '--speed') {
      if (!PETAL_SPEEDS.includes(value)) throw new Error(`--speed must be one of ${PETAL_SPEEDS.join(', ')}`);
      options.petalSpeed = value;
      fromFile = false;
      i++;
    }
  }

  return { options, fromFile };
}

function copyToClipboard(text) {
  for (const [command, args] of CLIPBOARDS) {
    try {
      execFileSync(command, args, { input: text });
      return command;
    } catch (err) {
      // Only a missing binary is worth trying the next candidate for. A real
      // failure from a clipboard that exists should surface.
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return null;
}

function main() {
  const { options, fromFile } = parseArgs(process.argv.slice(2));

  let css;
  let source;
  if (fromFile) {
    const file = path.join(ROOT, 'theme.css');
    if (!fs.existsSync(file)) {
      throw new Error('theme.css not found. Run "npm run build:theme" first.');
    }
    css = fs.readFileSync(file, 'utf8');
    source = 'theme.css';
  } else {
    css = compose(options);
    source = `composed (${options.shade}, trees=${options.trees}, petals=${options.petals})`;
  }

  const used = copyToClipboard(css);
  const kb = (Buffer.byteLength(css, 'utf8') / 1024).toFixed(1);

  if (used) {
    console.log(`[copy-css] ${kb} KB from ${source} copied with ${used}`);
    console.log('[copy-css] In RemNote: Settings, Interface, Add Custom CSS, then paste into the block.');
  } else {
    // Falling back to a file is better than failing: the user can still paste.
    const fallback = path.join(ROOT, 'build', 'clipboard.css');
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    fs.writeFileSync(fallback, css, 'utf8');
    console.warn('[copy-css] no clipboard command found (tried wl-copy, xclip, pbcopy)');
    console.warn(`[copy-css] wrote ${path.relative(ROOT, fallback)} instead, copy it by hand`);
  }
}

main();
