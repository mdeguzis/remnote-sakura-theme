#!/usr/bin/env node
/**
 * Inline assets/ and src/css/ into TypeScript modules.
 *
 * Both outputs are gitignored. The .svg and .css files are the source of truth,
 * this just makes them importable from a bundle that has no filesystem.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeIfChanged } from './lib/write-if-changed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_DIR = path.join(ROOT, 'assets');
const CSS_DIR = path.join(ROOT, 'src', 'css');
const LIB_DIR = path.join(ROOT, 'src', 'lib');

/**
 * Encode an SVG for use inside a `url("...")` value.
 *
 * Base64 would be simpler but inflates by a third and is unreadable in devtools.
 * Percent encoding only the characters that actually break the CSS value keeps
 * the result compact and inspectable.
 */
export function encodeSvg(svg) {
  const collapsed = svg
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const encoded = collapsed
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\n/g, '');

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/** Drop comments and collapse whitespace. Comments are for the source files. */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function readAssets() {
  const files = fs
    .readdirSync(ASSET_DIR)
    .filter((name) => name.endsWith('.svg'))
    .sort();

  if (files.length === 0) {
    throw new Error(`no SVG assets found in ${ASSET_DIR}. Run "npm run art" first.`);
  }

  const entries = {};
  for (const file of files) {
    const key = path.basename(file, '.svg');
    const svg = fs.readFileSync(path.join(ASSET_DIR, file), 'utf8');

    if (svg.includes('{{')) {
      throw new Error(`${file} still contains a {{PLACEHOLDER}}. Regenerate with "npm run art".`);
    }
    entries[key] = encodeSvg(svg);
  }
  return entries;
}

function readCss() {
  const files = fs
    .readdirSync(CSS_DIR)
    .filter((name) => name.endsWith('.css'))
    .sort();

  if (files.length === 0) {
    throw new Error(`no CSS fragments found in ${CSS_DIR}`);
  }

  const entries = {};
  for (const file of files) {
    entries[path.basename(file, '.css')] = minifyCss(fs.readFileSync(path.join(CSS_DIR, file), 'utf8'));
  }
  return entries;
}

function main() {
  const assets = readAssets();
  const css = readCss();

  const wroteAssets = writeIfChanged(
    path.join(LIB_DIR, 'assets.generated.ts'),
    `// GENERATED FILE. Do not edit.\n` +
      `// Produced by scripts/build-sources.mjs from assets/.\n\n` +
      `export const ASSETS: Record<string, string> = ${JSON.stringify(assets, null, 2)};\n`
  );

  const wroteCss = writeIfChanged(
    path.join(LIB_DIR, 'css.generated.ts'),
    `// GENERATED FILE. Do not edit.\n` +
      `// Produced by scripts/build-sources.mjs from src/css/.\n\n` +
      `export const CSS: Record<string, string> = ${JSON.stringify(css, null, 2)};\n`
  );

  if (!wroteAssets && !wroteCss) {
    console.log('[build-sources] unchanged');
    return;
  }

  const assetBytes = Object.values(assets).reduce((sum, uri) => sum + uri.length, 0);
  const cssBytes = Object.values(css).reduce((sum, text) => sum + text.length, 0);

  console.log(
    `[build-sources] assets=${Object.keys(assets).length} (${assetBytes} bytes) ` +
      `css=${Object.keys(css).length} (${cssBytes} bytes)`
  );
}

// Only run when invoked directly, so the encoder can be imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
