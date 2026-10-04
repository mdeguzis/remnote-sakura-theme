import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { compose } from '../src/lib/compose.ts';
import { DEFAULT_OPTIONS } from '../src/lib/options.ts';
import { decodePng, differingPixels } from './lib/png.mjs';
import { findBrowser, render, skipReason } from './lib/render.mjs';
import { VIEWPORT, documentRoute, pdfRoute } from './lib/fixtures.mjs';

/**
 * What a browser actually paints.
 *
 * The rest of the suite reads the stylesheet. That catches a rule going
 * missing and nothing else, and the bugs this theme has shipped were never
 * missing rules: 1.2.4 put the artwork over a PDF with correct looking CSS,
 * 1.2.5 fixed it and broke a toolbar, and the first fix for issue #8 looked
 * right in the file while removing the petals from the screen entirely. Each
 * was found by looking at a picture.
 *
 * Every test here works the same way: render the same fixture twice, once with
 * the effect off and once with it on, and compare rectangles. Nothing depends
 * on a colour or a threshold, so the palette can change freely. A rectangle
 * that must stay clean is asserted pixel identical; a rectangle that must show
 * the effect is asserted to have changed.
 */

const IS_CI = Boolean(process.env.CI);

before(() => {
  // A skipped render test in CI is the same as a deleted one, and this is the
  // only suite that can see a stacking bug. Locally it is allowed to skip: not
  // every change is worth installing a browser for.
  if (IS_CI && !findBrowser()) {
    throw new Error(`render tests cannot run in CI: ${skipReason()}`);
  }
});

// node:test treats a present-but-null `skip` as a skip, so normalise to false.
const skip = skipReason() ?? false;

/** The same stylesheet the plugin would hand RemNote, with and without petals. */
const withPetals = compose({ ...DEFAULT_OPTIONS, petals: true, petalDensity: 'heavy' });
const withoutPetals = compose({ ...DEFAULT_OPTIONS, petals: false });

function shoot(route, css, label) {
  return decodePng(render(route.html(css), { ...VIEWPORT, label }));
}

test('no petal is painted on a PDF page', { skip }, () => {
  // Issue #8. The page rectangle must be byte for byte the same whether the
  // petals are on or off, which is the strongest form of "nothing reached the
  // document" available: it does not care what colour a petal is, only that
  // the pixels under the page did not move.
  const off = shoot(pdfRoute, withoutPetals, 'pdf-off');
  const on = shoot(pdfRoute, withPetals, 'pdf-on');

  const leaked = differingPixels(off, on, pdfRoute.page);
  assert.equal(leaked, 0, `${leaked} pixels of petal landed on the PDF page`);
});

test('petals still fall in the workspace around a PDF', { skip }, () => {
  // The other half, and the one the first fix failed. Pushing the layers behind
  // the interface took them off the page by taking them off the screen, and
  // every selector test still passed. Here it fails: the workspace is identical
  // with the petals on, so nothing is being drawn.
  const off = shoot(pdfRoute, withoutPetals, 'pdf-off');
  const on = shoot(pdfRoute, withPetals, 'pdf-on');

  const drawn = differingPixels(off, on, pdfRoute.workspace);
  const area = pdfRoute.workspace.width * pdfRoute.workspace.height;
  assert.ok(
    drawn > area * 0.01,
    `only ${drawn} of ${area} workspace pixels changed, the petals are not reaching the canvas`
  );
});

test('petals still drift over an ordinary document', { skip }, () => {
  // Everywhere that is not a card or a page, a petal crossing the text is the
  // effect rather than the bug. A fix for the PDF that reached this route would
  // be a worse regression than the thing it fixed, since this is most of the app.
  const off = shoot(documentRoute, withoutPetals, 'doc-off');
  const on = shoot(documentRoute, withPetals, 'doc-on');

  const drawn = differingPixels(off, on, documentRoute.reading);
  const area = documentRoute.reading.width * documentRoute.reading.height;
  assert.ok(drawn > area * 0.01, `only ${drawn} of ${area} reading area pixels changed`);
});
