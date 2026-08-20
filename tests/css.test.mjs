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

test('the token overrides also land on the mode wrapper', () => {
  // RemNote declares the same tokens on the element that carries the mode
  // class. A declaration on an element beats one inherited from an ancestor at
  // any specificity, so overriding on :root alone reaches nothing inside that
  // wrapper. Losing the doubled class here sends the flashcard queue, and
  // anything else RemNote scopes that way, back to its own greys.
  const block = /(?:^|\n)([^{]*)\{[^}]*--rn-clr-background-primary:/.exec(FULL);
  assert.ok(block, 'token block not found');
  assert.match(block[1], /\.dark\.dark/, 'token block does not outrank RemNote\'s own .dark rule');
});

test('surfaces clear RemNote\'s elevation gradient', () => {
  // In dark mode the elevation tokens are gradients, which are background
  // IMAGES. A rule that sets only background-color leaves that opaque grey
  // image painted on top and the surface never changes.
  const rules = CSS.base.split('}').filter((rule) => /\.rn-clr-background-elevation-/.test(rule));
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    assert.match(rule, /background-image:\s*none/, `elevation rule does not clear the gradient: ${rule.trim().slice(0, 60)}`);
  }
});

test('the flashcard card is drawn over the artwork, not through it', () => {
  // The queue is one card on an otherwise empty screen with a branch behind it.
  // It needs a higher alpha than a page surface and an edge of its own, or the
  // artwork reads through the answer and the pale light mode card has no
  // boundary at all against a pale page.
  const card = /\.rn-queue\s*\{([^}]*)\}/.exec(CSS.base);
  assert.ok(card, 'no .rn-queue rule');
  const alpha = Number.parseFloat(/background-color:\s*rgba\([^,]+,\s*([\d.]+)\)/.exec(card[1])[1]);
  assert.ok(alpha >= 0.95, `queue card alpha ${alpha} is too low to read an answer through`);
  assert.match(card[1], /border:\s*1px solid rgba\(var\(--sakura-border\)/, 'queue card has no palette border');
});

test('petals do not drift over a flashcard', () => {
  // Everywhere else a petal crossing the text is the effect. Over the one card
  // the reader is being tested on it is something to read around.
  assert.match(CSS.petals, /html:has\(\.rn-queue-container\)[\s\S]*?z-index:\s*-1/);
});

test('RemNote\'s dark mode variants are outranked, not tied', () => {
  // `dark:rn-clr-background-primary` compiles to `.dark .dark\:rn-clr-...`,
  // which is two classes. Every plain utility rule here is one, so in dark mode
  // the variant wins and the surface keeps RemNote's grey. This is what left
  // the flashcard screen unthemed while the document screen was fine.
  assert.match(CSS.base, /\.dark \.dark\\:rn-clr-background-primary/);
});

test('the queue backdrop is reached without repainting every inverse surface', () => {
  // Inverse surfaces exist to contrast with the page. Overriding the class
  // outright would flatten tooltips and anything else built on it, so the queue
  // backdrop is cleared only on the route that mounts a queue.
  const rule = /html:has\(\.rn-queue-container\) \.rn-clr-background-inverse-primary/;
  assert.match(CSS.base, rule);
  const bare = CSS.base.match(/^\.rn-clr-background-inverse-primary\s*\{/m);
  assert.equal(bare, null, 'inverse-primary is overridden app wide');
});

test('the queue screen draws its own branches', () => {
  // Reasoning about z-index against RemNote's wrappers produced the wrong
  // answer twice: at 0 the branches covered the card, at -1 they vanished with
  // the rest of the screen. Drawn from the queue's own element they are in the
  // same stacking context as the card, which sits in a z-index 10 descendant,
  // so ordinary z-index rules settle it. Both halves of the swap must survive
  // together: the queue layer without the html layer being hidden doubles the
  // artwork, and the reverse leaves the screen bare.
  assert.match(CSS.trees, /\.rn-queue-container::before/);
  const hidden = /((?:html:has\([^)]+\)::(?:before|after),\s*)*html:has\([^)]+\)::after)\s*\{\s*display:\s*none/.exec(CSS.trees);
  assert.ok(hidden, 'the html layers are never switched off');
  assert.match(hidden[1], /html:has\(\.rn-queue-container\)::before/);
});

test('a PDF gets the same treatment as a flashcard', () => {
  // The canvas paints its own workspace in a hard coded colour and lays the
  // pages on top. Without both halves the reading area is either slate grey or
  // has branches across the page being read.
  assert.match(CSS.base, /\.drawing-canvas > div:has\(> \.drawing-canvas-bounds-display-container\)/);
  assert.match(CSS.trees, /\.drawing-canvas:has\(\.drawing-pdf-viewer\)::before/);
  assert.match(CSS.trees, /html:has\(\.drawing-pdf-viewer\)::before/);
});

test('the canvas layer is anchored to the canvas, not the viewport', () => {
  // Fixed would attach it to whichever ancestor happens to be transformed.
  // Absolute attaches it to the canvas, which clips its own overflow, so the
  // artwork stops at the edge of the reading area.
  const rule = /\.drawing-canvas:has\(\.drawing-pdf-viewer\)::before,\s*\.drawing-canvas:has\(\.drawing-pdf-viewer\)::after\s*\{\s*position:\s*absolute/;
  assert.match(CSS.trees, rule);
});

test('!important is used only where an inline style has to be beaten', () => {
  // RemNote paints the tab bar, the document sidebar and body itself with an
  // inline background, which nothing else can outrank. Anywhere else in this file an
  // !important would be hiding a specificity problem worth fixing properly.
  const allowed = ['#tab-bar-container', '.document-sidebar__container', 'body'];
  const important = [...CSS.base.matchAll(/([^{}]*)\{[^}]*!important/g)].map((m) => m[1].trim());
  assert.ok(important.length > 0, 'expected the inline style overrides to still be here');
  for (const selector of important) {
    for (const part of selector.split(',').map((one) => one.trim())) {
      assert.ok(allowed.includes(part), `!important on ${part}, which carries no inline background`);
    }
  }
});

test('the whole app is lifted over the artwork in one place', () => {
  // The branch layers are fixed at z-index 0, above everything unpositioned.
  // Positioning one more element per complaint fixed the tab bar and missed the
  // document title, because whether it works depends on which ancestor traps
  // the subtree. #main wraps everything RemNote renders, so lifting it settles
  // every screen at once.
  assert.match(CSS.base, /#main\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1/);
  // And the two opaque backgrounds that would otherwise hide the layer.
  assert.match(CSS.base, /body\s*\{\s*background-color:\s*transparent\s*!important/);
  assert.match(CSS.base, /#content\s*\{\s*background-color:\s*transparent/);
});

test('every backdrop-filter carries its webkit prefix', () => {
  // Safari took the unprefixed property in version 18. On an older iPad the
  // frosted surfaces lose their blur entirely, which is the difference between
  // a panel over a branch and mud. Same failure as the mask prefixes, and it
  // was found the same way: something looked wrong on a device, not here.
  const plain = (CSS.base.match(/(?:^|[^-])backdrop-filter:/gm) || []).length;
  const prefixed = (CSS.base.match(/-webkit-backdrop-filter:/g) || []).length;
  assert.equal(plain, prefixed, 'a backdrop-filter is missing its -webkit- pair');
  assert.ok(plain > 0);
});
