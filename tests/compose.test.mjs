import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compose } from '../src/lib/compose.ts';
import { SHADES, findShade, DEFAULT_SHADE } from '../src/lib/palettes.ts';
import {
  DEFAULT_OPTIONS,
  PETAL_DENSITIES,
  PETAL_SPEEDS,
  TREE_MODES,
  clampPercent,
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
  assert.match(css, /html\.dark/);
});

test('dark mode matches whether the dark class is on html or on a wrapper', () => {
  // RemNote documents dark mode as ".dark div { ... }", a descendant selector,
  // so the class may not be on <html> at all. Matching only html.dark left every
  // surface on the light palette in the real app.
  const css = compose(DEFAULT_OPTIONS);
  assert.match(css, /html\.dark,\s*\n?html:has\(\.dark\)/);
});

test('the dark palette is declared on the root element', () => {
  // Not on the wrapper: custom properties on a nested element cannot reach
  // html::before, which is where the branches are drawn.
  const darkBlock = /html\.dark,\s*\n?html:has\(\.dark\) \{([^}]*)\}/.exec(compose(DEFAULT_OPTIONS));
  assert.ok(darkBlock, 'no dark block found');
  assert.match(darkBlock[1], /--sakura-wood:/, 'dark block does not set the artwork colors');
  assert.match(darkBlock[1], /--sakura-bg-top:/);
});

test('the dark block comes after the light block so it wins', () => {
  const css = compose(DEFAULT_OPTIONS);
  assert.ok(css.indexOf(':root {') < css.indexOf('html.dark'));
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
  const input = {
    shade: 'yozakura',
    trees: 'bold',
    scenery: false,
    codeOpacity: 42,
    petals: true,
    petalDensity: 'heavy',
    petalSpeed: 'brisk',
  };
  assert.deepEqual(normalizeOptions(input), input);
});

// --- code block opacity --------------------------------------------------

test('code opacity reaches the stylesheet as a 0 to 1 alpha', () => {
  const css = compose({ ...DEFAULT_OPTIONS, codeOpacity: 40 });
  assert.match(css, /--sakura-code-opacity: 0\.400/);
});

test('code opacity is clamped to a valid alpha', () => {
  // A number setting accepts whatever the user types, and an out of range
  // alpha voids the whole declaration rather than just being ignored.
  assert.equal(clampPercent(150, 80), 100);
  assert.equal(clampPercent(-20, 80), 0);
  assert.equal(clampPercent('65', 80), 65);
  assert.equal(clampPercent('abc', 80), 80);
  assert.equal(clampPercent(undefined, 80), 80);
  assert.equal(clampPercent(null, 80), 80);
});

test('an out of range code opacity never emits an invalid alpha', () => {
  for (const value of [999, -50, Number.NaN, 'wide open']) {
    const css = compose({ ...DEFAULT_OPTIONS, codeOpacity: value });
    const alpha = Number.parseFloat(/--sakura-code-opacity: ([\d.]+)/.exec(css)[1]);
    assert.ok(alpha >= 0 && alpha <= 1, `alpha ${alpha} out of range for input ${value}`);
  }
});

test('code blocks default to no fill so the scenery stays continuous', () => {
  // Any value between the extremes shows the artwork dimmed, which steps in
  // brightness at the block edge and stops reading as one object.
  assert.equal(DEFAULT_OPTIONS.codeOpacity, 0);
  const css = compose(DEFAULT_OPTIONS);
  assert.match(css, /--sakura-code-opacity: 0\.000/);
  assert.match(css, /--sakura-code-blur: none/);
});

test('the blur is tied to the fill', () => {
  // Blurring at zero opacity leaves the artwork sharp outside the block and
  // soft inside, which is the same discontinuity in another form.
  assert.match(compose({ ...DEFAULT_OPTIONS, codeOpacity: 0 }), /--sakura-code-blur: none/);
  assert.match(compose({ ...DEFAULT_OPTIONS, codeOpacity: 80 }), /--sakura-code-blur: blur\(/);
});

test('the extremes of the code opacity setting both work', () => {
  assert.match(compose({ ...DEFAULT_OPTIONS, codeOpacity: 0 }), /--sakura-code-opacity: 0\.000/);
  assert.match(compose({ ...DEFAULT_OPTIONS, codeOpacity: 100 }), /--sakura-code-opacity: 1\.000/);
});

// --- scenery -------------------------------------------------------------

test('branches default to bold and the corner shop is on', () => {
  assert.equal(DEFAULT_OPTIONS.trees, 'bold');
  assert.equal(DEFAULT_OPTIONS.scenery, true);
});

test('the shop is drawn by default', () => {
  const css = compose(DEFAULT_OPTIONS);
  assert.match(css, /--sakura-scenery-shop-structure: url\(/);
  assert.match(css, /--sakura-scenery-shop-lights: url\(/);
});

test('turning the shop off resolves its layers to none', () => {
  // The shop shares its mask layers with the branches, so it cannot be removed
  // by dropping a rule. It has to resolve to none instead.
  const css = compose({ ...DEFAULT_OPTIONS, scenery: false });
  assert.match(css, /--sakura-scenery-shop-structure: none/);
  assert.match(css, /--sakura-scenery-shop-lights: none/);
  assert.match(css, /--sakura-branch-top-left-wood: url\(/, 'branches should be unaffected');
});

test('turning branches off resolves branch layers to none', () => {
  const css = compose({ ...DEFAULT_OPTIONS, trees: 'off' });
  assert.match(css, /--sakura-branch-top-left-wood: none/);
  assert.match(css, /--sakura-branch-bottom-left-blossoms: none/);
});

test('the shop still shows when branches are off', () => {
  // Both are painted by the same element, and that element has one opacity.
  // Using the branch opacity of zero here would hide the shop too.
  const css = compose({ ...DEFAULT_OPTIONS, trees: 'off', scenery: true });
  assert.match(css, /--sakura-scenery-shop-structure: url\(/);
  const opacity = Number.parseFloat(/--sakura-tree-opacity: ([\d.]+)/.exec(css)[1]);
  assert.ok(opacity > 0, 'layer opacity must stay above zero so the shop is visible');
});

test('the layer is dropped entirely when nothing is drawn on it', () => {
  const css = compose({ ...DEFAULT_OPTIONS, trees: 'off', scenery: false });
  assert.doesNotMatch(css, /html::before/, 'the branch layer should not be mounted at all');
});
