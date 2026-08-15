#!/usr/bin/env node
/**
 * Build a standalone preview page.
 *
 * Loading a theme into RemNote to look at a color takes about a minute. This
 * writes a single HTML file that mocks up the RemNote surfaces this theme
 * touches, using the real class names and the real composed CSS, so a shade can
 * be judged in a browser refresh instead.
 *
 * It is a mock, not RemNote. It proves colors, contrast, the branch placement
 * and the petal animation. It cannot prove that a selector matches something in
 * the actual app, which is what the manual check in RemNote is for.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compose } from '../src/lib/compose.ts';
import { SHADES } from '../src/lib/palettes.ts';
import { DEFAULT_OPTIONS, PETAL_DENSITIES, PETAL_SPEEDS, TREE_MODES } from '../src/lib/options.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'preview.html');

/** Every combination the controls can select, composed up front. */
function buildVariants() {
  const variants = {};
  for (const shade of SHADES) {
    for (const trees of TREE_MODES) {
      for (const petals of [false, true]) {
        for (const petalDensity of PETAL_DENSITIES) {
          for (const petalSpeed of PETAL_SPEEDS) {
            // Only vary density and speed when petals are actually on, or the
            // page balloons with identical stylesheets.
            if (!petals && (petalDensity !== DEFAULT_OPTIONS.petalDensity || petalSpeed !== DEFAULT_OPTIONS.petalSpeed)) {
              continue;
            }
            for (const scenery of [true, false]) {
              const key = [shade.id, trees, scenery ? 'shop' : 'noshop', petals ? 'on' : 'off', petalDensity, petalSpeed].join('|');
              variants[key] = compose({ shade: shade.id, trees, scenery, petals, petalDensity, petalSpeed });
            }
          }
        }
      }
    }
  }
  return variants;
}

const MOCK = `
<div class="rn-sidebar app-sidebar rn-clr-background-secondary">
  <div class="side-brand rn-clr-content-primary">Knowledge Base</div>
  <div class="side-item rn-clr-content-secondary">Daily Notes</div>
  <div class="side-item rn-clr-content-secondary">Flashcards</div>
  <div class="side-item active rn-clr-background-light-accent rn-clr-content-accent">Botany</div>
  <div class="side-item rn-clr-content-secondary">Reading List</div>
  <div class="side-item rn-clr-content-secondary">Archive</div>
</div>

<div class="app-main rn-clr-background-primary">
  <div class="rn-editor">
    <h1 class="rn-doc-title">Prunus serrulata</h1>
    <p class="rn-clr-content-secondary doc-sub">Edited 4 minutes ago &middot; 12 references</p>

    <div class="rn-editor-divider rn-divider"></div>

    <p class="rn-clr-content-primary">
      The Japanese cherry is grown for its <span class="rn-clr-content-accent">flowers</span> rather than its fruit.
      Blossoms open in a narrow window each spring, which is why <span class="hl">hanami</span> is timed so precisely.
    </p>
    <p class="rn-clr-content-primary">
      Petals fall within a week or two of opening. That brevity is the point: the tree is admired for a state it
      cannot hold, and this paragraph exists mainly so there is enough text to judge whether the body copy is
      comfortable to read against a translucent background with a branch behind it.
    </p>

    <div class="rn-tag-container">hanami</div>
    <div class="rn-tag-container">spring</div>

    <div class="card-row">
      <div class="rn-card rn-clr-background-elevation-10">
        <div class="rn-clr-content-primary card-title">Flowering window</div>
        <div class="rn-clr-content-secondary">Roughly one week, weather dependent.</div>
      </div>
      <div class="rn-card rn-clr-background-elevation-10">
        <div class="rn-clr-content-primary card-title">Cultivars</div>
        <div class="rn-clr-content-secondary">Somei Yoshino, Kanzan, Shirotae.</div>
      </div>
    </div>

    <div class="rn-dialog mock-dialog">
      <div class="rn-clr-content-primary card-title">A floating panel</div>
      <div class="rn-clr-content-secondary">
        Menus and dialogs stay near opaque on purpose. This one is sitting over a branch, and it has to stay readable.
      </div>
      <div class="btn-row">
        <button class="rn-button rn-clr-background-accent rn-clr-content-on-color">Confirm</button>
        <button class="rn-button rn-clr-background-elevation-20 rn-clr-content-primary">Cancel</button>
      </div>
    </div>
  </div>
</div>
`;

const PAGE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; min-height: 100vh; }
  .app { display: flex; min-height: 100vh; position: relative; z-index: 1; }
  .app-sidebar { width: 210px; flex: none; padding: 18px 12px; }
  .side-brand { font-weight: 650; font-size: 13px; margin-bottom: 16px; letter-spacing: .02em; }
  .side-item { font-size: 13px; padding: 7px 10px; border-radius: 8px; margin-bottom: 2px; }
  .app-main { flex: 1; padding: 40px 8px; }
  .rn-editor { max-width: 720px; margin: 0 auto; padding: 0 20px; }
  .rn-doc-title { font-size: 34px; margin: 0 0 4px; }
  .doc-sub { font-size: 13px; margin: 0 0 18px; }
  .rn-editor-divider { height: 1px; margin: 18px 0; }
  .rn-editor p { line-height: 1.65; font-size: 15px; }
  .hl { background: rgba(var(--sakura-accent), .22); padding: 0 3px; border-radius: 3px; }
  .rn-tag-container { display: inline-block; font-size: 12px; padding: 3px 11px; margin: 2px 4px 2px 0; }
  .card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 22px 0; }
  .rn-card { padding: 14px; }
  .card-title { font-weight: 620; margin-bottom: 5px; font-size: 14px; }
  .mock-dialog { padding: 18px; margin-top: 26px; }
  .btn-row { display: flex; gap: 8px; margin-top: 14px; }
  .rn-button { padding: 7px 16px; font-size: 13px; border: 0; cursor: pointer; font-family: inherit; }

  .controls {
    position: fixed; top: 12px; right: 12px; z-index: 500;
    background: rgba(20,20,24,.92); color: #fff; padding: 12px; border-radius: 12px;
    font: 12px/1.4 ui-monospace, monospace; display: grid; gap: 7px; backdrop-filter: blur(8px);
    box-shadow: 0 8px 30px rgba(0,0,0,.35);
  }
  .controls label { display: grid; grid-template-columns: 82px 1fr; gap: 8px; align-items: center; }
  .controls select, .controls button { font: inherit; padding: 3px 6px; border-radius: 6px; border: 1px solid #555; background: #2a2a30; color: #fff; }
  .controls .row { display: flex; gap: 6px; }
`;

/**
 * Pull the asset declarations out of every variant.
 *
 * Each composed stylesheet embeds ~40 KB of SVG data URIs. Left in place the
 * page came to 7 MB. They are plain custom properties on :root, so lifting them
 * into their own block behaves exactly the same.
 *
 * They are not identical across variants: switching the branches or the shop
 * off resolves those layers to `none` rather than a URI, because both are
 * painted by the same mask element and cannot be removed by dropping a rule.
 * So this groups the variants by their asset block and emits each distinct one
 * once. In practice that is a handful of blocks rather than one, which is still
 * far better than one per variant.
 */
function hoistAssets(variants) {
  const assetLine = /^\s*--sakura-(?:branch|petals|scenery)[^\n]*\n/gm;
  const blocks = new Map();
  const byVariant = {};

  for (const [key, css] of Object.entries(variants)) {
    const found = css.match(assetLine);
    if (!found) continue;

    const block = found.join('');
    if (!blocks.has(block)) blocks.set(block, `a${blocks.size}`);

    byVariant[key] = blocks.get(block);
    variants[key] = css.replace(assetLine, '');
  }

  if (blocks.size === 0) throw new Error('no asset declarations found to hoist');

  const assets = {};
  for (const [block, id] of blocks) assets[id] = `:root {\n${block}}`;
  return { assets, byVariant };
}

function main() {
  const variants = buildVariants();
  const { assets, byVariant } = hoistAssets(variants);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sakura preview</title>
<style>${PAGE_CSS}</style>
<style id="assets"></style>
<style id="theme"></style>
</head>
<body>
<div class="app">${MOCK}</div>

<div class="controls">
  <label>Shade
    <select id="shade">${SHADES.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
  </label>
  <label>Branches
    <select id="trees">${TREE_MODES.map((t) => `<option value="${t}"${t === DEFAULT_OPTIONS.trees ? ' selected' : ''}>${t}</option>`).join('')}</select>
  </label>
  <label>Shop
    <select id="scenery"><option value="shop">on</option><option value="noshop">off</option></select>
  </label>
  <label>Petals
    <select id="petals"><option value="off">off</option><option value="on">on</option></select>
  </label>
  <label>Density
    <select id="density">${PETAL_DENSITIES.map((d) => `<option value="${d}"${d === DEFAULT_OPTIONS.petalDensity ? ' selected' : ''}>${d}</option>`).join('')}</select>
  </label>
  <label>Speed
    <select id="speed">${PETAL_SPEEDS.map((s) => `<option value="${s}"${s === DEFAULT_OPTIONS.petalSpeed ? ' selected' : ''}>${s}</option>`).join('')}</select>
  </label>
  <div class="row">
    <button id="mode" type="button">dark mode</button>
    <button id="shot" type="button">copy css</button>
  </div>
</div>

<script>
const VARIANTS = ${JSON.stringify(variants)};
const ASSET_BLOCKS = ${JSON.stringify(assets)};
const ASSET_BY_VARIANT = ${JSON.stringify(byVariant)};
const DEFAULTS = ${JSON.stringify({ density: DEFAULT_OPTIONS.petalDensity, speed: DEFAULT_OPTIONS.petalSpeed })};
const el = (id) => document.getElementById(id);

function apply() {
  const petals = el('petals').value;
  // Density and speed only exist as variants when petals are on.
  const density = petals === 'on' ? el('density').value : DEFAULTS.density;
  const speed = petals === 'on' ? el('speed').value : DEFAULTS.speed;
  const key = [el('shade').value, el('trees').value, el('scenery').value, petals, density, speed].join('|');
  const css = VARIANTS[key];
  if (!css) { console.error('no variant for', key); return; }
  el('assets').textContent = ASSET_BLOCKS[ASSET_BY_VARIANT[key]] || '';
  el('theme').textContent = css;
}

for (const id of ['shade','trees','scenery','petals','density','speed']) {
  el(id).addEventListener('change', apply);
}
el('mode').addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  el('mode').textContent = document.documentElement.classList.contains('dark') ? 'light mode' : 'dark mode';
});
el('shot').addEventListener('click', async () => {
  await navigator.clipboard.writeText(el('theme').textContent);
  el('shot').textContent = 'copied';
  setTimeout(() => { el('shot').textContent = 'copy css'; }, 1200);
});
apply();
</script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');

  console.log(
    `[preview] ${path.relative(ROOT, OUT)} variants=${Object.keys(variants).length} ` +
      `assetBlocks=${Object.keys(assets).length} ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)} KB`
  );
  console.log(`[preview] open file://${OUT}`);
}

main();
