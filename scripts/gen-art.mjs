#!/usr/bin/env node
/**
 * Generate the blossom artwork as SVG files.
 *
 * The branches are grown procedurally rather than drawn by hand, because a
 * hand-drawn branch that has to work at four different corner positions and two
 * palettes ends up being four drawings. Growing them from one recursive rule
 * keeps the silhouettes consistent and lets the shape be tuned by changing a
 * number instead of redrawing a path.
 *
 * Output is deterministic: the PRNG is seeded per asset, so running this twice
 * produces byte identical files and the build stays reproducible. Regenerate
 * with `npm run art`, then commit the result. The compose step inlines these
 * into the CSS as data URIs.
 *
 * Nothing here carries a color. An SVG loaded through `background-image:
 * url(data:)` is an independent document: it cannot see `currentColor` and it
 * cannot read the host page's custom properties, so the usual recoloring tricks
 * do not work. Baking a copy per shade would mean roughly 300 KB of duplicated
 * data URIs.
 *
 * So these are drawn as pure alpha shapes and used as CSS masks instead. The
 * color then comes from the masked element's own background-color, which is a
 * normal custom property. One set of drawings serves every shade, and adding a
 * shade costs nothing but a few hex values.
 *
 * Wood and blossoms are separate files because a mask layer can only be one
 * color, and a brown branch carrying pink flowers needs two.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeShopSvgs } from './lib/shop.mjs';
import { writeIfChanged } from './lib/write-if-changed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets');

/** Small deterministic PRNG (mulberry32). Same seed, same branch, every time. */
function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to one decimal. Halves the file size versus full float precision. */
const r = (n) => Math.round(n * 10) / 10;

/** Round to three places, for scale factors, where one place is too coarse. */
const r3 = (n) => Math.round(n * 1000) / 1000;

/** The petal in <defs> is drawn at this length and scaled per use. */
const PETAL_UNIT = 100;

/** The reusable petal definition shared by every blossom in a file. */
const PETAL_DEFS = () =>
  `<defs><path id="sp" d="${petalPath(PETAL_UNIT, PETAL_UNIT * 0.86)}"/></defs>`;

/**
 * One sakura petal, centred on the origin and pointing up.
 *
 * The notch at the tip is what makes it read as cherry rather than as a generic
 * flower, so it is drawn explicitly rather than using a plain teardrop.
 */
function petalPath(length, width) {
  const halfWidth = width / 2;
  const notch = length * 0.16;
  return [
    `M0,0`,
    `C${r(-halfWidth)},${r(-length * 0.28)} ${r(-halfWidth)},${r(-length * 0.72)} ${r(-halfWidth * 0.42)},${r(-length)}`,
    `L0,${r(-length + notch)}`,
    `L${r(halfWidth * 0.42)},${r(-length)}`,
    `C${r(halfWidth)},${r(-length * 0.72)} ${r(halfWidth)},${r(-length * 0.28)} 0,0`,
    `Z`,
  ].join(' ');
}

/**
 * A five petal blossom.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} size petal length
 * @param {number} rotation degrees
 * @param {number} opacity
 */
function blossom(cx, cy, size, rotation, opacity) {
  const petals = [];
  const scale = size / PETAL_UNIT;
  for (let i = 0; i < 5; i++) {
    const angle = rotation + i * 72;
    // <use> of one defined path instead of repeating the bezier five times per
    // blossom. On a branch with ~40 blossoms that is the difference between a
    // 110 KB data URI and a usable one.
    petals.push(`<use href="#sp" transform="rotate(${r(angle)}) scale(${r(scale)})"/>`);
  }
  // The stamen dot is drawn at a lower opacity of the same color rather than in
  // a second color, so the blossom still works when the theme recolors it.
  return (
    `<g transform="translate(${r(cx)},${r(cy)})" opacity="${r(opacity)}" fill="#000">` +
    petals.join('') +
    `</g>`
  );
}

/**
 * Grow a branch recursively.
 *
 * Each segment tapers, forks at a shallow angle, and drops blossoms near the
 * tips where a real branch carries them.
 */
function growBranch(state, config, random, out) {
  const { x, y, angle, thickness, depth } = state;

  if (depth > config.maxDepth || thickness < config.minThickness) {
    return;
  }

  const length = config.segmentLength * (0.72 + random() * 0.5) * (1 - depth * 0.07);
  const rad = (angle * Math.PI) / 180;

  const endX = x + Math.cos(rad) * length;
  const endY = y + Math.sin(rad) * length;

  // Bow each segment slightly so the limb reads as grown rather than plotted.
  const bow = (random() - 0.5) * length * 0.35;
  const midX = (x + endX) / 2 + Math.cos(rad + Math.PI / 2) * bow;
  const midY = (y + endY) / 2 + Math.sin(rad + Math.PI / 2) * bow;

  out.wood.push(
    `<path d="M${r(x)},${r(y)} Q${r(midX)},${r(midY)} ${r(endX)},${r(endY)}" ` +
      `stroke-width="${r(thickness)}" fill="none" stroke-linecap="round"/>`
  );

  const nearTip = depth >= config.maxDepth - 2;
  if (nearTip && random() < config.blossomChance) {
    const count = 1;
    for (let i = 0; i < count; i++) {
      const spread = config.blossomSize * 1.6;
      out.blossoms.push(
        blossom(
          endX + (random() - 0.5) * spread,
          endY + (random() - 0.5) * spread,
          config.blossomSize * (0.65 + random() * 0.6),
          random() * 72,
          0.75 + random() * 0.25
        )
      );
    }
  }

  const forks = depth < 2 ? 2 : random() < 0.5 ? 2 : 1;
  for (let i = 0; i < forks; i++) {
    const direction = forks === 1 ? (random() - 0.5) * 2 : i === 0 ? -1 : 1;
    const spread = config.forkAngle * (0.55 + random() * 0.9);
    growBranch(
      {
        x: endX,
        y: endY,
        angle: angle + direction * spread,
        thickness: thickness * (0.66 + random() * 0.12),
        depth: depth + 1,
      },
      config,
      random,
      out
    );
  }
}

/**
 * A corner branch that reaches inward from one edge of the viewport.
 *
 * @param {{ seed: number, width: number, height: number, origin: [number, number], angle: number }} spec
 */
function makeBranchSvg(spec) {
  const random = makeRandom(spec.seed);
  const out = { wood: [], blossoms: [] };

  const config = {
    maxDepth: 6,
    minThickness: 0.9,
    segmentLength: spec.width * 0.115,
    forkAngle: 27,
    blossomChance: 0.55,
    blossomSize: spec.width * 0.026,
  };

  growBranch(
    {
      x: spec.origin[0],
      y: spec.origin[1],
      angle: spec.angle,
      thickness: spec.width * 0.02,
      depth: 0,
    },
    config,
    random,
    out
  );

  const open =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" ` +
    `width="${spec.width}" height="${spec.height}">`;

  return {
    wood: `${open}<g stroke="#000" fill="none">${out.wood.join('')}</g></svg>`,
    blossoms: `${open}${PETAL_DEFS()}${out.blossoms.join('')}</svg>`,
  };
}

/**
 * Scatter points over a tile that wraps at its edges, evenly but not regularly.
 *
 * Plain uniform random placement clumps: with a handful of points there is
 * always a cluster somewhere and a hole somewhere else, and once the tile
 * repeats, that same cluster marches down the screen in a grid. Mitchell's best
 * candidate keeps each new point as far as possible from the ones already
 * placed, which reads as natural spacing without the regularity of a jittered
 * grid. Distance is measured around the wrap, so the spacing holds across the
 * seam as well.
 */
function scatter(random, width, height, count) {
  const points = [];
  const wrapDistance = (a, b) => {
    const dx = Math.min(Math.abs(a[0] - b[0]), width - Math.abs(a[0] - b[0]));
    const dy = Math.min(Math.abs(a[1] - b[1]), height - Math.abs(a[1] - b[1]));
    return Math.hypot(dx, dy);
  };

  for (let i = 0; i < count; i++) {
    let best = null;
    let bestDistance = -1;
    // More candidates means more even spacing. Four leaves room for the loose
    // clusters real snowfall has; eight looked evenly planted.
    for (let c = 0; c < 4; c++) {
      const candidate = [random() * width, random() * height];
      const nearest = points.reduce((min, p) => Math.min(min, wrapDistance(candidate, p)), Infinity);
      if (nearest > bestDistance) {
        best = candidate;
        bestDistance = nearest;
      }
    }
    points.push(best);
  }
  return points;
}

/**
 * Every position at which a shape centred on (x, y) has to be drawn so the
 * tile wraps: the point itself, plus a copy shifted by one tile for each edge
 * the shape crosses.
 *
 * This is what lets pieces sit anywhere in the tile. The previous version kept
 * them clear of the edges instead, and the empty margin around every tile lined
 * up into visible rows and columns once the tile repeated.
 */
function wrapped(x, y, reach, width, height) {
  const xs = [x];
  const ys = [y];
  if (x < reach) xs.push(x + width);
  if (x > width - reach) xs.push(x - width);
  if (y < reach) ys.push(y + height);
  if (y > height - reach) ys.push(y - height);
  return xs.flatMap((px) => ys.map((py) => [px, py]));
}

const tileSvg = (width, height, defs, body, fill = '#000') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
  `width="${width}" height="${height}" fill="${fill}">${defs}${body}</svg>`;

/**
 * A tileable field of loose petals, used for the falling animation.
 *
 * `size` is the tile's height and sets the piece scale; the tile is `aspect`
 * times as wide. Tiles are not square because the fall is vertical: only a
 * tile's height has to divide the drop, so the widths are free to be
 * mismatched, and mismatched widths stop the layer repeating across the window.
 */
function makePetalTile(seed, size, count, scale, aspect) {
  const random = makeRandom(seed);
  const petals = [];
  const width = Math.round(size * aspect);

  for (const [x, y] of scatter(random, width, size, count)) {
    const petalSize = size * scale * (0.6 + random() * 0.8);
    const rotation = random() * 360;
    // Squashing a petal horizontally reads as one that has turned edge on while
    // falling, which keeps a static tile from looking like wallpaper.
    const squash = 0.35 + random() * 0.65;
    const opacity = r(0.45 + random() * 0.55);
    // One element per petal: the squash and the size fold into a single
    // scale, so no wrapping group is needed. These tiles are a third of the
    // stylesheet, and the wrapper was a quarter of each one.
    const k = petalSize / PETAL_UNIT;
    for (const [px, py] of wrapped(x, y, petalSize * 0.6, width, size)) {
      petals.push(
        `<use href="#sp" opacity="${opacity}" ` +
          `transform="translate(${r(px)},${r(py)}) rotate(${r(rotation)}) scale(${r3(squash * k)},${r3(k)})"/>`
      );
    }
  }

  return tileSvg(width, size, PETAL_DEFS(), petals.join(''));
}

/**
 * The winter stand in for the petal tile: the same size, so density and speed
 * mean the same thing in both seasons, but more and much smaller pieces.
 *
 * Modelled on the two most used snow libraries rather than on intuition, after
 * the first version (a hard dot inside a halo ring, up to ~50px across on
 * screen) read as bubbles. react-snowfall draws flakes at a radius of 0.5 to 3
 * px; hcodes/snowflakes makes a bigger flake more opaque and faster, so size
 * reads as nearness. So here:
 *
 *   radius  tiny, skewed hard toward the small end with the odd larger flake
 *   edge    a soft radial falloff, which is what a flake looks like out of focus
 *   opacity rises with radius, so the larger flakes read as the near ones
 *
 * Speed rising with size comes from petals.css: the alt tile is drawn larger
 * and falls faster.
 *
 * `scale` is the largest radius as a fraction of the tile.
 */
function makeSnowTile(seed, size, count, scale, aspect) {
  const random = makeRandom(seed);
  const flakes = [];
  const width = Math.round(size * aspect);
  const defs =
    '<defs><radialGradient id="f">' +
    '<stop offset="0" stop-opacity="1"/><stop offset="0.45" stop-opacity="0.85"/>' +
    '<stop offset="1" stop-opacity="0"/></radialGradient></defs>';

  for (const [x, y] of scatter(random, width, size, count)) {
    // t is 0 for the smallest flake and 1 for the largest; squaring it makes
    // large flakes uncommon without leaving the field all dust.
    const t = random() ** 2;
    const radius = size * scale * (0.3 + 0.7 * t);
    const opacity = r(0.45 + 0.55 * t);
    // Round, not motion blurred. A reference clip shows flakes as upright
    // ovals, but on a page they read as smears rather than snow.
    for (const [px, py] of wrapped(x, y, radius, width, size)) {
      flakes.push(
        // Whole units for the position: a tile unit is about 1.6px on screen,
        // so rounding moves a flake by under a pixel, and the decimals were a
        // tenth of the snow's weight in the stylesheet.
        `<circle cx="${Math.round(px)}" cy="${Math.round(py)}" r="${r(radius)}" opacity="${opacity}"/>`
      );
    }
  }

  // The gradient is set once as the root fill and inherited by every flake.
  return tileSvg(width, size, defs, flakes.join(''), 'url(#f)');
}

/**
 * How many times larger a falling tile is drawn than the piece count was tuned
 * for. A tile repeats across the screen, and any piece that stands out (a big
 * flake, a petal turned flat) marks the repeat. At one tile per 42vh the same
 * petal came round four times across a wide window. Doubling the tile in each
 * axis and quadrupling the count at half the drawing scale keeps the density
 * and the on-screen piece size exactly as they were, and pushes the repeat out
 * to about once a window. options.ts doubles the tile sizes and durations to
 * match.
 */
const FALL_TILE_SCALE = 2;

/**
 * Tile proportions, which petals.css must draw the tiles at. A test reads both
 * sides and checks they agree.
 *
 *   ALT_RATIO     alt tile height against the main tile's (--sakura-alt). Must
 *                 divide 1: the fall drops one main tile per loop, and every
 *                 tile has to land whole or the loop jumps.
 *   MAIN_ASPECT   main tile width over height (--sakura-main-aspect)
 *   ALT_ASPECT    alt tile width over ITS height (--sakura-alt-aspect)
 *
 * The aspects are chosen so the two widths, 1.37 and 0.83 main tiles, share
 * no small common multiple. Sideways, the layer then takes many windows to
 * repeat, where square tiles that divide each other repeated every tile.
 */
const ALT_RATIO = 1 / 2;
const MAIN_ASPECT = 1.37;
const ALT_ASPECT = 1.66;

/**
 * The alt tile's pieces, against the main tile's. Smaller, so the alt tile's
 * shorter repeat reads as background speckle rather than as a second grid.
 */
const ALT_PIECE_SCALE = 0.6;

/**
 * A falling layer's two tiles, at FALL_TILE_SCALE. Counts are per square main
 * tile area and are scaled to each tile's real area, so density is unchanged.
 */
function fallingTiles(name, make, size, scale, [[seed, count], [altSeed, altCount]]) {
  const k = FALL_TILE_SCALE;
  const q = ALT_RATIO;
  return {
    [`${name}.svg`]: make(seed, size * k, Math.round(count * k * k * MAIN_ASPECT), scale / k, MAIN_ASPECT),
    [`${name}-alt.svg`]: make(
      altSeed,
      size * k,
      Math.round(altCount * k * k * q * q * ALT_ASPECT),
      (scale / k / q) * ALT_PIECE_SCALE,
      ALT_ASPECT
    ),
  };
}

const BRANCHES = {
  'top-left': { seed: 20260814, width: 900, height: 620, origin: [-20, 40], angle: 22 },
  'top-right': { seed: 77415, width: 900, height: 620, origin: [920, 20], angle: 152 },
  'bottom-left': { seed: 31337, width: 820, height: 540, origin: [-30, 560], angle: -28 },
};

const ASSETS = {
  // Each falling layer stacks two tiles (see petals.css), each from its own
  // seed. The alt count is per main tile area, like the main count.
  ...fallingTiles('petals-near', makePetalTile, 260, 0.075, [[4242, 7], [5171, 6]]),
  ...fallingTiles('petals-far', makePetalTile, 320, 0.045, [[909, 9], [6343, 8]]),
  // Snow scale is the largest radius as a fraction of the tile. At the
  // default density that is about 5.5px on screen near and 2.5px far, soft
  // edged, so the visible core is roughly half that.
  ...fallingTiles('snow-near', makeSnowTile, 260, 0.0135, [[1225, 16], [8821, 14]]),
  ...fallingTiles('snow-far', makeSnowTile, 320, 0.0078, [[2112, 24], [3907, 20]]),
};

const shop = makeShopSvgs();
ASSETS['scenery-shop-structure.svg'] = shop.structure;
ASSETS['scenery-shop-lights.svg'] = shop.lights;

for (const [position, spec] of Object.entries(BRANCHES)) {
  const layers = makeBranchSvg(spec);
  ASSETS[`branch-${position}-wood.svg`] = layers.wood;
  ASSETS[`branch-${position}-blossoms.svg`] = layers.blossoms;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let changed = 0;
  for (const [name, svg] of Object.entries(ASSETS)) {
    if (writeIfChanged(path.join(OUT_DIR, name), svg + '\n')) {
      changed++;
      console.log(`[gen-art] ${name} ${Buffer.byteLength(svg, 'utf8')} bytes`);
    }
  }
  if (changed === 0) console.log('[gen-art] unchanged');
}

main();
