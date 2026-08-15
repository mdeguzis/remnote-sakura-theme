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
 * A tileable field of loose petals, used for the falling animation.
 *
 * Petals are kept clear of the tile edges so the seam is not obvious once the
 * layer is drifting and semi transparent.
 */
function makePetalTile(seed, size, count, scale) {
  const random = makeRandom(seed);
  const petals = [];
  const margin = size * 0.12;

  for (let i = 0; i < count; i++) {
    const x = margin + random() * (size - margin * 2);
    const y = margin + random() * (size - margin * 2);
    const petalSize = size * scale * (0.7 + random() * 0.6);
    const rotation = random() * 360;
    // Squashing a petal horizontally reads as one that has turned edge on while
    // falling, which keeps a static tile from looking like wallpaper.
    const squash = 0.45 + random() * 0.55;
    petals.push(
      `<g transform="translate(${r(x)},${r(y)}) rotate(${r(rotation)}) scale(${r(squash)},1)" ` +
        `opacity="${r(0.5 + random() * 0.5)}">` +
        `<use href="#sp" transform="scale(${r(petalSize / PETAL_UNIT)})"/>` +
        `</g>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" ` +
    `width="${size}" height="${size}" fill="#000">` +
    PETAL_DEFS() +
    petals.join('') +
    `</svg>`
  );
}

const BRANCHES = {
  'top-left': { seed: 20260814, width: 900, height: 620, origin: [-20, 40], angle: 22 },
  'top-right': { seed: 77415, width: 900, height: 620, origin: [920, 20], angle: 152 },
  'bottom-left': { seed: 31337, width: 820, height: 540, origin: [-30, 560], angle: -28 },
};

const ASSETS = {
  'petals-near.svg': makePetalTile(4242, 260, 7, 0.075),
  'petals-far.svg': makePetalTile(909, 320, 9, 0.045),
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
