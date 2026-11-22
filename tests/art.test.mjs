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
    'petals-far-alt.svg',
    'petals-far.svg',
    'petals-near-alt.svg',
    'petals-near.svg',
    'scenery-shop-lights.svg',
    'scenery-shop-structure.svg',
    'snow-far-alt.svg',
    'snow-far.svg',
    'snow-near-alt.svg',
    'snow-near.svg',
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

test('build-sources does not rewrite unchanged output', async () => {
  // webpack runs this before every compile and watches the directory it writes
  // into, so an unconditional write means every compile dirties a watched file
  // and triggers the next one. That loop reached fifteen thousand compiles
  // before it was noticed, because the only symptom is a hot machine.
  const { execFileSync } = await import('node:child_process');
  const script = path.join(ROOT, 'scripts/build-sources.mjs');
  const generated = [
    path.join(ROOT, 'src/lib/assets.generated.ts'),
    path.join(ROOT, 'src/lib/css.generated.ts'),
  ];

  execFileSync('node', [script], { stdio: 'ignore' });
  const before = generated.map((file) => fs.statSync(file).mtimeMs);

  const output = execFileSync('node', [script], { encoding: 'utf8' });
  const after = generated.map((file) => fs.statSync(file).mtimeMs);

  assert.match(output, /unchanged/, 'second run should report nothing to do');
  assert.deepEqual(after, before, 'second run rewrote a file that had not changed');
});

test('generating the art twice produces identical files', async () => {
  // The PRNG is seeded, so a rebuild must not churn the committed assets.
  const before = files.map((file) => fs.readFileSync(path.join(ASSET_DIR, file), 'utf8'));
  await import('../scripts/gen-art.mjs?rerun=' + Date.now());
  const after = files.map((file) => fs.readFileSync(path.join(ASSET_DIR, file), 'utf8'));
  assert.deepEqual(after, before, 'art generation is not deterministic');
});

test('falling tiles are drawn in the proportions petals.css gives them', () => {
  // The generator and the stylesheet both state the tile shapes. If they
  // disagree every piece is stretched, and if the alt height stops dividing the
  // main one the fall loop jumps. Both are silent in the browser.
  const css = fs.readFileSync(path.join(ROOT, 'src', 'css', 'petals.css'), 'utf8');
  const cssNumber = (name) => {
    const m = new RegExp(`--sakura-${name}: (?:calc\\((\\d+) / (\\d+)\\)|([\\d.]+));`).exec(css);
    assert.ok(m, `--sakura-${name} is not declared`);
    return m[3] ? Number(m[3]) : Number(m[1]) / Number(m[2]);
  };
  const box = (file) => {
    const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(fs.readFileSync(path.join(ASSET_DIR, file), 'utf8'));
    return { w: Number(w), h: Number(h) };
  };

  const alt = cssNumber('alt');
  assert.ok(Number.isInteger(1 / alt), `--sakura-alt ${alt} does not divide one tile`);

  for (const name of ['petals-near', 'petals-far', 'snow-near', 'snow-far']) {
    const main = box(`${name}.svg`);
    const altBox = box(`${name}-alt.svg`);
    assert.ok(Math.abs(main.w / main.h - cssNumber('main-aspect')) < 0.01, `${name} main tile aspect`);
    assert.ok(Math.abs(altBox.w / altBox.h - cssNumber('alt-aspect')) < 0.01, `${name} alt tile aspect`);
  }
});
