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

test('the changelog has an entry for the current version', () => {
  // A release with no changelog entry is a release nobody can read.
  const version = read('package.json').version;
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes(`[${version}]`), `CHANGELOG.md has no entry for ${version}`);
});
