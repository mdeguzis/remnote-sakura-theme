import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { encodeSvg } from '../scripts/build-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_DIR = path.join(ROOT, 'assets');

const files = fs.readdirSync(ASSET_DIR).filter((name) => name.endsWith('.svg'));

test('the expected artwork exists', () => {
  const expected = [
    'branch-bottom-left-blossoms.svg',
    'branch-bottom-left-wood.svg',
    'branch-top-left-blossoms.svg',
    'branch-top-left-wood.svg',
    'branch-top-right-blossoms.svg',
    'branch-top-right-wood.svg',
    'petals-far.svg',
    'petals-near.svg',
    'scenery-shop-lights.svg',
    'scenery-shop-structure.svg',
  ];
  assert.deepEqual(files.slice().sort(), expected);
});

test('every asset is a well formed standalone svg', () => {
  for (const file of files) {
    const svg = fs.readFileSync(path.join(ASSET_DIR, file), 'utf8');
    assert.match(svg, /^<svg /, `${file} does not start with an svg element`);
    assert.match(svg, /<\/svg>\s*$/, `${file} is not closed`);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${file} is missing the namespace`);
    assert.match(svg, /viewBox="/, `${file} has no viewBox, so it cannot scale`);
  }
});

test('artwork carries no color of its own', () => {
  // These are alpha masks. A stray color would be ignored by the mask anyway,
  // but its presence means someone reintroduced the per shade baking problem.
  for (const file of files) {
    const svg = fs.readFileSync(path.join(ASSET_DIR, file), 'utf8');
    assert.doesNotMatch(svg, /currentColor/, `${file} uses currentColor, which does not resolve in a mask`);
    assert.doesNotMatch(svg, /var\(--/, `${file} uses a custom property, which does not resolve in a mask`);
    assert.doesNotMatch(svg, /\{\{/, `${file} still has a placeholder`);
  }
});

test('internal references use a plain fragment id', () => {
  // The %23 form belongs in the data uri, not in the file on disk. Getting this
  // backwards leaves every blossom invisible.
  for (const file of files.filter((name) => name.includes('blossom') || name.includes('petal'))) {
    const svg = fs.readFileSync(path.join(ASSET_DIR, file), 'utf8');
    assert.match(svg, /href="#sp"/, `${file} does not reference the shared petal`);
    assert.doesNotMatch(svg, /href="%23/, `${file} has a pre-encoded fragment reference`);
  }
});

test('each asset stays within its size budget', () => {
  for (const file of files) {
    const bytes = fs.statSync(path.join(ASSET_DIR, file)).size;
    assert.ok(bytes < 20 * 1024, `${file} is ${bytes} bytes, over the 20 KB budget`);
  }
});

test('encodeSvg escapes what breaks a css url value', () => {
  const encoded = encodeSvg('<svg xmlns="http://www.w3.org/2000/svg"><path fill="#abc"/></svg>');
  assert.doesNotMatch(encoded, /[<>"]/);
  assert.match(encoded, /%3Csvg/);
  assert.match(encoded, /%23abc/);
});

test('encodeSvg escapes percent signs before introducing its own', () => {
  // Escaping in the wrong order turns a literal % into a broken escape.
  const encoded = encodeSvg('<svg width="50%"/>');
  assert.match(encoded, /50%25/);
});

test('generating the art twice produces identical files', async () => {
  // The PRNG is seeded, so a rebuild must not churn the committed assets.
  const before = files.map((file) => fs.readFileSync(path.join(ASSET_DIR, file), 'utf8'));
  await import('../scripts/gen-art.mjs?rerun=' + Date.now());
  const after = files.map((file) => fs.readFileSync(path.join(ASSET_DIR, file), 'utf8'));
  assert.deepEqual(after, before, 'art generation is not deterministic');
});
