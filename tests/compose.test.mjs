import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compose } from '../src/lib/compose.ts';
import { SHADES, findShade, DEFAULT_SHADE } from '../src/lib/palettes.ts';
import {
  DEFAULT_OPTIONS,
  PETAL_DENSITIES,
  PETAL_SPEEDS,
  TREE_MODES,
  normalizeOptions,
} from '../src/lib/options.ts';

test('petals are off by default', () => {
  // Continuous motion behind text has to be opt in.
  assert.equal(DEFAULT_OPTIONS.petals, false);
});

test('the default stylesheet has branches but no petal animation', () => {
  const css = compose(DEFAULT_OPTIONS);
  assert.match(css, /mask-image/);
  assert.doesNotMatch(css, /@keyframes sakura-fall/);
});

test('turning petals on adds the animation', () => {
  const css = compose({ ...DEFAULT_OPTIONS, petals: true });
  assert.match(css, /@keyframes sakura-fall-near/);
  assert.match(css, /@keyframes sakura-fall-far/);
});

test('turning branches off drops the branch layer entirely', () => {
  // Not merely set to zero opacity: a fixed full viewport masked element still
  // costs compositing when invisible.
  const css = compose({ ...DEFAULT_OPTIONS, trees: 'off' });
  assert.doesNotMatch(css, /--sakura-branch-tl-wood\)/);
});

test('every shade composes for every combination of options', () => {
  for (const shade of SHADES) {
    for (const trees of TREE_MODES) {
      for (const petals of [false, true]) {
        for (const petalDensity of PETAL_DENSITIES) {
          for (const petalSpeed of PETAL_SPEEDS) {
            const css = compose({ shade: shade.id, trees, petals, petalDensity, petalSpeed });
            assert.ok(css.length > 500, `${shade.id} produced a suspiciously short stylesheet`);
          }
        }
      }
    }
  }
});

test('composed css never contains undefined or NaN', () => {
  // A single undefined interpolation invalidates the declaration it lands in,
  // and the failure is silent in the browser.
  for (const shade of SHADES) {
    const css = compose({ ...DEFAULT_OPTIONS, shade: shade.id, petals: true });
    assert.doesNotMatch(css, /undefined/, `${shade.id} emitted undefined`);
    assert.doesNotMatch(css, /NaN/, `${shade.id} emitted NaN`);
  }
});

test('both palettes are emitted, with dark gated on RemNote dark class', () => {
  const css = compose(DEFAULT_OPTIONS);
  assert.match(css, /^:root \{/m);
  assert.match(css, /html\.dark \{/);
});

test('the dark block comes after the light block so it wins', () => {
  const css = compose(DEFAULT_OPTIONS);
  assert.ok(css.indexOf(':root {') < css.indexOf('html.dark {'));
});

test('an unknown shade falls back to the default rather than throwing', () => {
  // A stored setting can name a shade removed in a later version.
  const css = compose({ ...DEFAULT_OPTIONS, shade: 'not-a-shade' });
  const fallback = findShade(DEFAULT_SHADE);
  assert.ok(fallback);
  assert.match(css, new RegExp(fallback.name));
});

test('shade ids are unique', () => {
  const ids = SHADES.map((shade) => shade.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every shade defines a full light and dark palette', () => {
  const keys = Object.keys(SHADES[0].light);
  for (const shade of SHADES) {
    for (const mode of ['light', 'dark']) {
      assert.deepEqual(
        Object.keys(shade[mode]).sort(),
        keys.slice().sort(),
        `${shade.id}.${mode} does not match the palette shape`
      );
      for (const [key, value] of Object.entries(shade[mode])) {
        assert.match(
          value,
          /^\d{1,3}, \d{1,3}, \d{1,3}$/,
          `${shade.id}.${mode}.${key} is not an "r, g, b" triplet`
        );
      }
    }
  }
});

test('density changes how many petals land on screen', () => {
  // Density is expressed as tile size, so a denser setting means a smaller tile.
  const sparse = compose({ ...DEFAULT_OPTIONS, petals: true, petalDensity: 'sparse' });
  const heavy = compose({ ...DEFAULT_OPTIONS, petals: true, petalDensity: 'heavy' });

  const read = (css) => Number.parseFloat(/--sakura-petal-size-near: ([\d.]+)vh/.exec(css)[1]);
  assert.ok(read(heavy) < read(sparse), 'heavy should use a smaller tile than sparse');
});

test('speed changes the animation duration', () => {
  const slow = compose({ ...DEFAULT_OPTIONS, petals: true, petalSpeed: 'slow' });
  const brisk = compose({ ...DEFAULT_OPTIONS, petals: true, petalSpeed: 'brisk' });

  const read = (css) => Number.parseFloat(/--sakura-petal-duration-near: ([\d.]+)s/.exec(css)[1]);
  assert.ok(read(brisk) < read(slow), 'brisk should be a shorter duration than slow');
});

test('bolder branches mean higher opacity', () => {
  const read = (mode) =>
    Number.parseFloat(/--sakura-tree-opacity: ([\d.]+)/.exec(compose({ ...DEFAULT_OPTIONS, trees: mode }))[1]);
  assert.ok(read('subtle') < read('normal'));
  assert.ok(read('normal') < read('bold'));
});

// --- option normalization ------------------------------------------------

test('normalizeOptions repairs junk from stored settings', () => {
  const out = normalizeOptions({ trees: 'enormous', petalSpeed: 7, petals: 'yes' });
  assert.equal(out.trees, DEFAULT_OPTIONS.trees);
  assert.equal(out.petalSpeed, DEFAULT_OPTIONS.petalSpeed);
  assert.equal(out.petals, DEFAULT_OPTIONS.petals);
});

test('normalizeOptions handles null and undefined', () => {
  assert.deepEqual(normalizeOptions(null), DEFAULT_OPTIONS);
  assert.deepEqual(normalizeOptions(undefined), DEFAULT_OPTIONS);
});

test('normalizeOptions keeps valid values untouched', () => {
  const input = { shade: 'yozakura', trees: 'bold', petals: true, petalDensity: 'heavy', petalSpeed: 'brisk' };
  assert.deepEqual(normalizeOptions(input), input);
});
