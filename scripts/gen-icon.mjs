#!/usr/bin/env node
/**
 * Generate the marketplace icon.
 *
 * RemNote shows this at roughly 48px in a list next to other themes, so the
 * design is driven by that size: a filled blossom scene rather than a branch on
 * a light ground. At 48px a delicate branch turns into grey fuzz, while a few
 * large overlapping blossoms still read as cherry.
 *
 * Writes public/logo.png, which is the filename RemNote's own plugins use.
 * Rasterizing needs rsvg-convert; without it the SVG is still written so the
 * icon can be produced elsewhere.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
// Deliberately NOT in assets/: everything there is inlined into the theme CSS
// as a mask data URI, and the icon is neither a mask nor part of the stylesheet.
const SVG_PATH = path.join(ROOT, 'assets', 'icon', 'logo.svg');
const PNG_PATH = path.join(ROOT, 'logo.png');

const SIZE = 512;

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

const r = (n) => Math.round(n * 10) / 10;
const PETAL_UNIT = 100;

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

/** A blossom, drawn with a lighter center petal set so it has some depth. */
function blossom(cx, cy, size, rotation, fill, stamen, opacity) {
  const scale = size / PETAL_UNIT;
  const petals = [];
  for (let i = 0; i < 5; i++) {
    petals.push(`<use href="#p" fill="${fill}" transform="rotate(${r(rotation + i * 72)}) scale(${r(scale)})"/>`);
  }
  return (
    `<g transform="translate(${r(cx)},${r(cy)})" opacity="${r(opacity)}">` +
    petals.join('') +
    `<circle r="${r(size * 0.15)}" fill="${stamen}"/>` +
    // Short stamen filaments. At icon size these read as texture, not detail.
    `<g stroke="${stamen}" stroke-width="${r(size * 0.035)}" stroke-linecap="round" opacity="0.75">` +
    [0, 72, 144, 216, 288]
      .map((a) => {
        const rad = ((a + 36) * Math.PI) / 180;
        const inner = size * 0.12;
        const outer = size * 0.34;
        return (
          `<line x1="${r(Math.cos(rad) * inner)}" y1="${r(Math.sin(rad) * inner)}" ` +
          `x2="${r(Math.cos(rad) * outer)}" y2="${r(Math.sin(rad) * outer)}"/>`
        );
      })
      .join('') +
    `</g></g>`
  );
}

function buildIcon() {
  const random = makeRandom(880814);
  const parts = [];

  // A dusk sky so the pale blossoms have something to sit against. A pink on
  // pink icon disappears in the marketplace list.
  parts.push(
    `<defs>` +
      `<path id="p" d="${petalPath(PETAL_UNIT, PETAL_UNIT * 0.86)}"/>` +
      `<linearGradient id="sky" x1="0" y1="0" x2="0.35" y2="1">` +
      `<stop offset="0" stop-color="#3b2452"/>` +
      `<stop offset="0.55" stop-color="#6d3560"/>` +
      `<stop offset="1" stop-color="#b8556d"/>` +
      `</linearGradient>` +
      `<radialGradient id="glow" cx="0.72" cy="0.78" r="0.55">` +
      `<stop offset="0" stop-color="#ffd9c2" stop-opacity="0.55"/>` +
      `<stop offset="1" stop-color="#ffd9c2" stop-opacity="0"/>` +
      `</radialGradient>` +
      `</defs>`
  );

  parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="url(#sky)"/>`);
  parts.push(`<rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>`);

  // A branch sweeping across the corner, thick enough to survive downscaling.
  parts.push(
    `<g stroke="#3a2230" fill="none" stroke-linecap="round" opacity="0.92">` +
      // A diagonal limb fills a square better than a horizontal one, which
      // otherwise leaves the lower half as empty gradient.
      `<path d="M-10,60 Q140,150 240,250 T470,470" stroke-width="26"/>` +
      `<path d="M120,132 Q230,150 330,120" stroke-width="14"/>` +
      `<path d="M210,215 Q120,270 60,360" stroke-width="13"/>` +
      `<path d="M300,320 Q390,300 450,230" stroke-width="12"/>` +
      `<path d="M368,392 Q330,450 350,510" stroke-width="10"/>` +
      `</g>`
  );

  // Blossoms clustered along the branch, largest first so smaller ones layer on
  // top rather than being swallowed.
  const spots = [
    [74, 96, 88],
    [206, 128, 96],
    [338, 106, 78],
    [126, 268, 82],
    [286, 300, 86],
    [430, 214, 68],
    [56, 386, 72],
    [398, 404, 76],
    [246, 438, 62],
    [468, 92, 54],
  ];

  for (const [x, y, size] of spots) {
    const pale = random() > 0.55;
    parts.push(
      blossom(x, y, size, random() * 72, pale ? '#ffd7e6' : '#f7aecb', '#c65b86', 0.93 + random() * 0.07)
    );
  }

  // Loose petals drifting in the open sky area.
  for (let i = 0; i < 9; i++) {
    const x = 30 + random() * (SIZE - 60);
    const y = 40 + random() * (SIZE - 80);
    const size = 26 + random() * 20;
    parts.push(
      `<g transform="translate(${r(x)},${r(y)}) rotate(${r(random() * 360)}) scale(${r(0.5 + random() * 0.5)},1)" ` +
        `opacity="${r(0.5 + random() * 0.4)}">` +
        `<use href="#p" fill="#ffc9dd" transform="scale(${r(size / PETAL_UNIT)})"/>` +
        `</g>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">` +
    parts.join('') +
    `</svg>`
  );
}

function main() {
  const svg = buildIcon();
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(SVG_PATH), { recursive: true });
  fs.writeFileSync(SVG_PATH, svg + '\n', 'utf8');
  console.log(`[gen-icon] assets/icon/logo.svg ${Buffer.byteLength(svg, 'utf8')} bytes`);

  try {
    execFileSync('rsvg-convert', ['-w', '512', '-h', '512', SVG_PATH, '-o', PNG_PATH], { stdio: 'pipe' });
    console.log(`[gen-icon] logo.png ${fs.statSync(PNG_PATH).size} bytes`);
  } catch (err) {
    // Not fatal: the SVG is the source and CI does not need the raster.
    console.warn(
      `[gen-icon] could not rasterize (${err.code === 'ENOENT' ? 'rsvg-convert not installed' : err.message}). ` +
        `logo.png was not refreshed.`
    );
  }
}

main();
