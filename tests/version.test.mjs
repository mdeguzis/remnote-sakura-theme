import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

test('the plugin manifest version matches package.json', () => {
  // The theme manifest is generated from package.json, but the plugin manifest
  // is written by hand. Nothing kept the two in step, so the plugin could ship
  // claiming a version it was not. Bumping one and forgetting the other is the
  // easiest mistake here and the hardest to notice.
  const pkg = read('package.json');
  const manifest = read('public/manifest.json');
  const { major, minor, patch } = manifest.version;

  assert.equal(`${major}.${minor}.${patch}`, pkg.version);
});

test('the version is a plain semver triple', () => {
  assert.match(read('package.json').version, /^\d+\.\d+\.\d+$/);
});

test('the plugin bundle carries the files RemNote requires', () => {
  // Everything in public/ is copied into the bundle, so these are what end up
  // in the zip. RemNote's uploader rejects a manifest declaring "theme" if the
  // zip has no theme.css, with "Theme plugins must include a theme.css file."
  // That rule appears nowhere in the submission documentation, so nothing but
  // a failed upload would reveal it again.
  for (const file of ['manifest.json', 'theme.css', 'snippet.css']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'public', file)), `public/${file} is missing`);
  }
  // The icon sits at the repo root rather than in public/, because the theme
  // zip needs it there too. webpack copies it into the bundle separately.
  assert.ok(fs.existsSync(path.join(ROOT, 'logo.png')), 'logo.png is missing');
});

test('a manifest declaring a theme is packaged as a theme plugin', () => {
  // The declaration is what triggers the theme.css requirement, so the two have
  // to be changed together.
  const manifest = read('public/manifest.json');
  if (Array.isArray(manifest.theme) && manifest.theme.length > 0) {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'public', 'theme.css')),
      'manifest declares "theme" but public/theme.css is missing, so the upload will be rejected'
    );
  }
});

test('the changelog has an entry for the current version', () => {
  // A release with no changelog entry is a release nobody can read.
  const version = read('package.json').version;
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes(`[${version}]`), `CHANGELOG.md has no entry for ${version}`);
});

test('the checked in manifest carries the real id, not a dev one', () => {
  // The "-dev" suffix exists only to stop a development build colliding with an
  // installed release, and webpack applies it on the way into the bundle. If it
  // ever appears in the source manifest it would ship, and the released plugin
  // would install under the wrong id.
  const manifest = read('public/manifest.json');
  assert.doesNotMatch(manifest.id, /-dev$/, `manifest id is "${manifest.id}"`);
  assert.doesNotMatch(manifest.name, /\(dev\)/, `manifest name is "${manifest.name}"`);
});
