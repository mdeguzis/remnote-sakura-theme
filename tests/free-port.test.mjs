import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isThemeProjectName } from '../scripts/free-port.mjs';

/*
 * Which processes the port guard is willing to stop.
 *
 * The guard exists so that a stale dev server does not block a restart, and the
 * whole point of it is that it refuses to kill anything else. Widening it to
 * cover the sibling themes is only safe while "sibling theme" stays a narrow
 * test, so that narrowness is what is pinned here.
 *
 * Importing this file at all also checks something: free-port only runs its
 * main routine when invoked directly. Without that guard, importing it killed
 * whatever dev server was running.
 */

test('our themes are recognised', () => {
  assert.ok(isThemeProjectName('remnote-koneko-theme'));
  assert.ok(isThemeProjectName('remnote-sakura-theme'));
});

test('nothing else is', () => {
  for (const name of [
    'my-app',
    'remnote-theme',
    'remnote-koneko-theme-sandbox',
    'proton-pulse-web',
    'webpack-dev-server',
    '',
    null,
    undefined,
    42,
  ]) {
    assert.equal(isThemeProjectName(name), false, `${String(name)} should not be treated as ours`);
  }
});
