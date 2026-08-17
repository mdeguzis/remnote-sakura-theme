import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SHADES, withTintStrength } from '../src/lib/palettes.ts';
import { TINT_MAX, TINT_MIN } from '../src/lib/options.ts';

/**
 * Contrast checks for every shade, in both modes.
 *
 * The dark palettes hold onto their plum and indigo rather than dropping to
 * charcoal, because a cherry theme that goes grey at night has lost the point.
 * That choice spends contrast, and contrast spent by eye is contrast nobody
 * measures. These tests put a floor under it.
 *
 * Thresholds follow WCAG 2.1: 4.5:1 for body text, 3:1 for large text and for
 * meaningful non-text marks like borders.
 */

/** Parse an "r, g, b" triplet. */
function channels(triplet) {
  return triplet.split(',').map((part) => Number.parseInt(part.trim(), 10));
}

/** Relative luminance, per WCAG. */
function luminance(triplet) {
  const [r, g, b] = channels(triplet).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Surfaces are drawn at partial alpha over the page, so the effective colour
 * behind text is a blend rather than the declared value. Checking text against
 * the raw surface would be measuring something the user never sees.
 */
function blend(foreground, background, alpha) {
  const f = channels(foreground);
  const b = channels(background);
  return f.map((value, i) => Math.round(value * alpha + b[i] * (1 - alpha))).join(', ');
}

for (const shade of SHADES) {
  for (const mode of ['light', 'dark']) {
    const palette = shade[mode];
    const label = `${shade.id}/${mode}`;

    test(`${label}: body text on the page is readable`, () => {
      // 0.62 is the alpha the page surface is drawn at in base.css.
      const surface = blend(palette.bgTop, palette.bgBottom, 0.62);
      const ratio = contrast(palette.text, surface);
      assert.ok(ratio >= 4.5, `${label} body text contrast is ${ratio.toFixed(2)}, below 4.5`);
    });

    test(`${label}: muted text stays legible`, () => {
      const surface = blend(palette.bgTop, palette.bgBottom, 0.62);
      const ratio = contrast(palette.textMuted, surface);
      assert.ok(ratio >= 3, `${label} muted text contrast is ${ratio.toFixed(2)}, below 3`);
    });

    test(`${label}: text on a floating panel is readable`, () => {
      // Dialogs and menus sit at 0.94 over the page.
      const panel = blend(palette.elevated, palette.bgBottom, 0.94);
      const ratio = contrast(palette.text, panel);
      assert.ok(ratio >= 4.5, `${label} panel text contrast is ${ratio.toFixed(2)}, below 4.5`);
    });

    test(`${label}: the accent is usable as text`, () => {
      const surface = blend(palette.bgTop, palette.bgBottom, 0.62);
      const ratio = contrast(palette.accent, surface);
      assert.ok(ratio >= 3, `${label} accent contrast is ${ratio.toFixed(2)}, below 3`);
    });

    test(`${label}: the light and dark grounds are genuinely different`, () => {
      // Guards against a palette being edited into the wrong mode, which would
      // otherwise only show up as an unreadable app.
      const other = mode === 'light' ? shade.dark : shade.light;
      assert.ok(
        contrast(palette.bgTop, other.bgTop) > 2,
        `${label} ground is too close to the ${mode === 'light' ? 'dark' : 'light'} one`
      );
    });
  }

  test(`${shade.id}: the dark ground keeps some colour rather than going grey`, () => {
    // The whole reason the dark palettes are not charcoal. A neutral ground
    // means the blossom colour has been lost, which is the failure this theme
    // exists to avoid.
    const [r, g, b] = channels(shade.dark.bgTop);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    assert.ok(spread >= 8, `${shade.id} dark ground is near neutral (spread ${spread})`);
  });

  test(`${shade.id}: the dark ground is still dark enough to be a dark mode`, () => {
    assert.ok(
      luminance(shade.dark.bgTop) < 0.12,
      `${shade.id} dark ground is too light to read as dark mode`
    );
  });
}

/*
 * Tint strength.
 *
 * The setting deepens the grounds while the text colour stays exactly where it
 * was, so every step up spends contrast. These palettes start with less to
 * spare than most, because the dark ones hold their plum and indigo instead of
 * dropping to charcoal. The range is only safe if the floor still holds at the
 * far end of it, and nobody is going to check that by eye for eight palettes.
 * These walk the whole range instead.
 */
for (const shade of SHADES) {
  for (const mode of ['light', 'dark']) {
    const label = `${shade.id}/${mode}`;

    test(`${label}: body text stays readable across the whole tint range`, () => {
      for (let strength = TINT_MIN; strength <= TINT_MAX; strength += 10) {
        const palette = withTintStrength(shade[mode], strength);
        const surface = blend(palette.bgTop, palette.bgBottom, 0.62);
        const ratio = contrast(palette.text, surface);
        assert.ok(ratio >= 4.5, `${label} at tint ${strength}: ${ratio.toFixed(2)}:1 on the page`);
      }
    });

    test(`${label}: panel text stays readable across the whole tint range`, () => {
      // Elevated holds menus, dialogs and code blocks, and takes only a third
      // of the lightness shift for exactly this reason.
      for (let strength = TINT_MIN; strength <= TINT_MAX; strength += 10) {
        const palette = withTintStrength(shade[mode], strength);
        const panel = blend(palette.elevated, palette.bgTop, 0.94);
        const ratio = contrast(palette.text, panel);
        assert.ok(ratio >= 4.5, `${label} at tint ${strength}: ${ratio.toFixed(2)}:1 on a panel`);
      }
    });
  }
}

test('tint strength at 100 changes nothing at all', () => {
  // The default has to be the palette exactly as authored, or every colour
  // decision made by eye is silently re-tuned by a round trip.
  for (const shade of SHADES) {
    for (const mode of ['light', 'dark']) {
      assert.deepEqual(withTintStrength(shade[mode], 100), shade[mode], `${shade.id}/${mode}`);
    }
  }
});

test('tint strength moves the ground in the direction it claims', () => {
  const base = SHADES[0].light;
  assert.ok(
    luminance(withTintStrength(base, 200).bgTop) < luminance(base.bgTop),
    'higher strength should deepen the ground'
  );
  assert.ok(
    luminance(withTintStrength(base, 40).bgTop) > luminance(base.bgTop),
    'lower strength should lighten it'
  );
});

test('tint strength leaves text, accent and artwork alone', () => {
  // Only the grounds move. Shifting text would make the contrast floor
  // meaningless, and shifting wood or blossom would change what the tree is
  // made of rather than what it stands on.
  for (const strength of [0, 50, 200]) {
    const out = withTintStrength(SHADES[0].light, strength);
    for (const key of ['text', 'textMuted', 'accent', 'border', 'wood', 'blossom', 'petal']) {
      assert.equal(out[key], SHADES[0].light[key], `${key} moved at strength ${strength}`);
    }
  }
});

test('every palette colour is a parseable triplet after tinting', () => {
  // This palette stores channels, not hex. A tint that emitted hex would void
  // every rgba() it landed in, silently.
  for (const shade of SHADES) {
    for (const mode of ['light', 'dark']) {
      const out = withTintStrength(shade[mode], 175);
      for (const [key, value] of Object.entries(out)) {
        assert.match(value, /^\d{1,3}, \d{1,3}, \d{1,3}$/, `${shade.id}/${mode}.${key} = ${value}`);
      }
    }
  }
});
