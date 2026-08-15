import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compose } from '../src/lib/compose.ts';
import { DEFAULT_OPTIONS } from '../src/lib/options.ts';
import { CSS } from '../src/lib/css.generated.ts';
import { ASSETS } from '../src/lib/assets.generated.ts';

/** The full stylesheet, everything switched on. */
const FULL = compose({ ...DEFAULT_OPTIONS, trees: 'bold', petals: true });

/** Custom properties the stylesheet reads. */
function referencedVars(css) {
  const names = new Set();
  const re = /var\(\s*(--sakura-[\w-]+)/g;
  let match;
  while ((match = re.exec(css)) !== null) names.add(match[1]);
  return names;
}

/** Custom properties the stylesheet declares. */
function declaredVars(css) {
  const names = new Set();
  const re = /^\s*(--sakura-[\w-]+)\s*:/gm;
  let match;
  while ((match = re.exec(css)) !== null) names.add(match[1]);
  return names;
}

test('every variable the css reads is also declared', () => {
  // This is the failure this theme is most prone to: a typo in a var name makes
  // one surface silently fall back to RemNote's own color, with no error
  // anywhere, and it is easy to miss on a surface you did not happen to open.
  const missing = [...referencedVars(FULL)].filter((name) => !declaredVars(FULL).has(name));
  assert.deepEqual(missing, [], `undeclared custom properties: ${missing.join(', ')}`);
});

test('no declared variable goes unused', () => {
  const unused = [...declaredVars(FULL)].filter((name) => !referencedVars(FULL).has(name));
  assert.deepEqual(unused, [], `declared but never used: ${unused.join(', ')}`);
});

test('braces balance in every fragment', () => {
  for (const [name, css] of Object.entries(CSS)) {
    const open = (css.match(/\{/g) || []).length;
    const close = (css.match(/\}/g) || []).length;
    assert.equal(open, close, `${name}.css has unbalanced braces`);
  }
});

test('braces balance in the composed stylesheet', () => {
  assert.equal((FULL.match(/\{/g) || []).length, (FULL.match(/\}/g) || []).length);
});

test('the decorative layers can never intercept input', () => {
  // Full viewport fixed elements sit over the interface. Without
  // pointer-events: none they would swallow every click in the app.
  for (const name of ['trees', 'petals']) {
    const rules = CSS[name].split('}');
    const positioned = rules.filter((rule) => /position:\s*fixed/.test(rule));
    assert.ok(positioned.length > 0, `${name}.css declares no fixed layer`);
    for (const rule of positioned) {
      assert.match(rule, /pointer-events:\s*none/, `${name}.css has a fixed layer without pointer-events: none`);
    }
  }
});

test('the petal animation respects reduced motion', () => {
  assert.match(CSS.petals, /@media \(prefers-reduced-motion: reduce\)/);
});

test('the petal loop lands on whole tiles in both axes', () => {
  // A repeating mask only looks continuous if the animation ends on a multiple
  // of the tile size. A hard coded offset in vw or px snaps the pattern back at
  // the loop point and the petals visibly teleport, which is what the first
  // version did with a 14vw sideways drift.
  const keyframes = CSS.petals.match(/@keyframes sakura-fall-\w+\s*\{[^@]*?\n\}/g) || [];
  assert.equal(keyframes.length, 2, 'expected two petal keyframe blocks');

  for (const block of keyframes) {
    const destinations = [...block.matchAll(/(?:^|[^-])mask-position:\s*([^;]+);/g)]
      .map((m) => m[1].trim())
      .filter((value) => value !== '0 0');

    assert.ok(destinations.length > 0, 'no destination offset found');
    for (const value of destinations) {
      assert.doesNotMatch(value, /\d\s*(vw|vh|px|%)/, `hard coded offset "${value}" will break the loop`);
      assert.match(value, /--sakura-petal-size-/, `offset "${value}" is not expressed in tiles`);
    }
  }
});

test('RemNote design tokens are repointed at the palette', () => {
  // This is what actually themes the app. RemNote's tokens are custom
  // properties as well as classes, and overriding the variables reaches
  // internal elements that carry no documented class. Losing this block sends
  // the theme back to hunting individual selectors.
  const required = [
    '--rn-clr-background-primary',
    '--rn-clr-background-secondary',
    '--rn-clr-content-primary',
    '--rn-clr-border-opaque',
    '--current-background-color',
  ];
  for (const name of required) {
    assert.match(FULL, new RegExp(`${name}:`), `${name} is not overridden`);
  }
});

test('every RemNote token override resolves to a sakura value', () => {
  // An override pointing at nothing is worse than no override: it replaces
  // RemNote's working colour with an invalid one.
  const overrides = [...FULL.matchAll(/(--rn-clr-[\w-]+):\s*([^;]+);/g)];
  assert.ok(overrides.length > 10, 'expected the token block to be substantial');
  for (const [, name, value] of overrides) {
    assert.match(value, /var\(--sakura-|transparent/, `${name} does not use a sakura value: ${value}`);
  }
});

test('the resting scrollbar is not tinted with the accent', () => {
  // The accent is a saturated cherry. Used as a resting scrollbar colour it
  // draws a bright pink bar down the edge of every scrollable region, which
  // against a pale code block reads as something bleeding through rather than
  // as a scrollbar. Hover is allowed: a deliberate pointer makes it a response.
  const rules = CSS.base.split('}');
  for (const rule of rules) {
    if (!/::-webkit-scrollbar-thumb/.test(rule)) continue;
    if (/:hover/.test(rule)) continue;
    assert.doesNotMatch(
      rule,
      /background-color:\s*rgba\(var\(--sakura-accent\)/,
      `resting scrollbar uses the accent: ${rule.trim().slice(0, 90)}`
    );
  }
});

test('code block scrollbar rules use a descendant combinator', () => {
  // ".rn-code-node::-webkit-scrollbar-thumb" styles the scrollbar of that
  // element itself, but the element that actually scrolls is CodeMirror's
  // .cm-scroller inside it. Written without the space the rule matches nothing
  // and the bar silently falls through to the global tint.
  const selectors = CSS.base
    .split('}')
    .map((rule) => rule.split('{')[0])
    .filter((selector) => /scrollbar-thumb/.test(selector) && /rn-code-node|cm-editor/.test(selector));

  assert.ok(selectors.length > 0, 'no code block scrollbar rule found');
  for (const selector of selectors) {
    assert.match(
      selector,
      /(rn-code-node|cm-editor)\s+::-webkit-scrollbar-thumb/,
      `missing descendant combinator, this rule matches nothing: ${selector.trim().slice(0, 80)}`
    );
  }
});

test('mask layers ship the webkit prefixed property too', () => {
  // Without the prefixed form the branches vanish entirely in the engines that
  // still need it, which reads as the theme being broken rather than plain.
  for (const name of ['trees', 'petals']) {
    const maskImages = (CSS[name].match(/[^-]mask-image:/g) || []).length;
    const webkitMaskImages = (CSS[name].match(/-webkit-mask-image:/g) || []).length;
    assert.equal(maskImages, webkitMaskImages, `${name}.css prefixed mask-image count does not match`);
  }
});

test('text colors are fully opaque', () => {
  // Backgrounds are translucent on purpose. Text never is.
  const contentRules = CSS.base.split('}').filter((rule) => /\.rn-clr-content-/.test(rule));
  assert.ok(contentRules.length > 0);
  for (const rule of contentRules) {
    assert.doesNotMatch(rule, /color:\s*rgba\(/, `text color uses rgba: ${rule.trim().slice(0, 80)}`);
  }
});

test('the scenery structure outweighs its lit detail on screen', async () => {
  // The blossom layer is painted at 1.25x the branch layer, so equal authored
  // alphas do not land equal. And equal alpha is not equal prominence anyway:
  // the structure is a desaturated mass and the lights are small saturated
  // marks, so under a translucent panel the mass fades first and the marks are
  // left floating with no building around them.
  const shop = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('../scripts/lib/shop.mjs', import.meta.url), 'utf8')
  );
  const read = (name) => Number.parseFloat(new RegExp(`const ${name} = ([\\d.]+)`).exec(shop)[1]);

  const BLOSSOM_LAYER_MULTIPLIER = 1.25;
  const structure = read('STRUCTURE_ALPHA');
  const lights = read('LIGHT_ALPHA') * BLOSSOM_LAYER_MULTIPLIER;
  const detail = read('DETAIL_ALPHA') * BLOSSOM_LAYER_MULTIPLIER;

  assert.ok(structure > detail, `structure ${structure} must outweigh detail ${detail}`);
  assert.ok(structure > lights, `structure ${structure} must outweigh lights ${lights}`);
});

test('assets are inlined as svg data uris', () => {
  assert.ok(Object.keys(ASSETS).length >= 8);
  for (const [name, uri] of Object.entries(ASSETS)) {
    assert.match(uri, /^data:image\/svg\+xml;charset=utf-8,/, `${name} is not an svg data uri`);
    assert.doesNotMatch(uri, /[<>"]/, `${name} contains characters that break a css url() value`);
    assert.doesNotMatch(uri, /\{\{/, `${name} still contains a placeholder`);
  }
});

test('the composed stylesheet stays within a sane size', () => {
  // The artwork dominates. If this jumps, a branch got denser than intended.
  const kb = Buffer.byteLength(FULL, 'utf8') / 1024;
  assert.ok(kb < 80, `composed stylesheet is ${kb.toFixed(0)} KB, over the 80 KB budget`);
});

test('no remote url survives into the stylesheet', () => {
  // Everything must be self contained: a remote request would leak that the
  // user has this theme on, and would break offline.
  const urls = [...FULL.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    assert.match(url, /^data:/, `non data url in stylesheet: ${url.slice(0, 60)}`);
  }
});
