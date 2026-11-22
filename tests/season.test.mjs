import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compose, SNOW_COLOR } from '../src/lib/compose.ts';
import { DEFAULT_OPTIONS, normalizeOptions } from '../src/lib/options.ts';
import { hemisphereFromTimeZone, isSnowSeason, resolveHemisphere } from '../src/lib/season.ts';

// Local time constructors, because isSnowSeason reads the local month.
const JANUARY = new Date(2027, 0, 15);
const JULY = new Date(2027, 6, 15);
const APRIL = new Date(2027, 3, 15);

const petals = { ...DEFAULT_OPTIONS, petals: true };

test('each hemisphere snows in its own winter and nowhere else', () => {
  assert.equal(isSnowSeason('northern', JANUARY, ''), true);
  assert.equal(isSnowSeason('northern', JULY, ''), false);
  assert.equal(isSnowSeason('southern', JULY, ''), true);
  assert.equal(isSnowSeason('southern', JANUARY, ''), false);
  assert.equal(isSnowSeason('northern', APRIL, ''), false);
});

test('winter is December to February, both ends included', () => {
  assert.equal(isSnowSeason('northern', new Date(2026, 11, 1), ''), true);
  assert.equal(isSnowSeason('northern', new Date(2027, 1, 28), ''), true);
  assert.equal(isSnowSeason('northern', new Date(2026, 10, 30), ''), false);
  assert.equal(isSnowSeason('northern', new Date(2027, 2, 1), ''), false);
});

test('a pinned season ignores the calendar and the time zone', () => {
  for (const date of [JANUARY, APRIL, JULY]) {
    assert.equal(isSnowSeason('winter', date, 'Australia/Sydney'), true);
    assert.equal(isSnowSeason('spring', date, 'Europe/Oslo'), false);
  }
  assert.equal(resolveHemisphere('winter', 'Europe/Oslo'), null);
  assert.equal(resolveHemisphere('spring', 'Europe/Oslo'), null);
});

test('always winter snows outside winter', () => {
  const css = compose({ ...petals, season: 'winter' }, JULY, '');
  assert.match(css, /, snowing \*\//);
});

test('always spring keeps the petals in midwinter', () => {
  const css = compose({ ...petals, season: 'spring' }, JANUARY, '');
  assert.doesNotMatch(css, /snowing/);
  assert.match(css, /--sakura-petals-near: url\("[^"]*href='%23sp'/);
});

test('an unknown season falls back to the default', () => {
  // Also covers anyone who ran a dev build with the earlier 'off' value.
  assert.equal(normalizeOptions({ season: 'arctic' }).season, DEFAULT_OPTIONS.season);
  assert.equal(normalizeOptions({ season: 'off' }).season, DEFAULT_OPTIONS.season);
});

test('in winter the petal layer carries the snow tile and colour', () => {
  const css = compose({ ...petals, season: 'northern' }, JANUARY, '');
  assert.match(css, /, snowing \*\//);
  assert.ok(css.includes(`--sakura-petal: ${SNOW_COLOR.light};`), 'light block missing the snow colour');
  assert.ok(css.includes(`--sakura-petal: ${SNOW_COLOR.dark};`), 'dark block missing the snow colour');
  // The petal artwork is replaced, not layered under the snow.
  assert.doesNotMatch(css, /--sakura-petals-near: url\("[^"]*href='%23sp'/);
  assert.match(css, /@keyframes sakura-fall-near/);
});

test('outside winter nothing about snow is shipped', () => {
  const css = compose({ ...petals, season: 'northern' }, JULY, '');
  assert.doesNotMatch(css, /snowing/);
  assert.doesNotMatch(css, /--sakura-snow-/);
  assert.ok(!css.includes(SNOW_COLOR.light));
  assert.match(css, /--sakura-petals-near: url\("[^"]*href='%23sp'/);
});

test('snow needs the petals on', () => {
  // Snow replaces the petals, it is not its own layer, so it must not bring
  // back motion someone switched off.
  const css = compose({ ...DEFAULT_OPTIONS, petals: false, season: 'winter' }, JANUARY, '');
  assert.doesNotMatch(css, /snowing/);
  assert.doesNotMatch(css, /@keyframes sakura-fall/);
});

test('winter swaps the petal artwork for snow rather than adding to it', () => {
  // Same number of images either way: the snow tiles stand in for the petal
  // tiles, they are not shipped alongside them.
  const images = (css) => (css.match(/url\("data:/g) || []).length;
  const winter = compose({ ...petals, season: 'northern' }, JANUARY, '');
  const spring = compose({ ...petals, season: 'northern' }, APRIL, '');
  assert.equal(images(winter), images(spring));
});

test('snow sways less than petals', () => {
  const read = (css) => Number.parseFloat(/--sakura-petal-sway: ([\d.]+)vw;/.exec(css)[1]);
  const spring = read(compose({ ...petals, season: 'spring' }, JANUARY, ''));
  const winter = read(compose({ ...petals, season: 'winter' }, JANUARY, ''));
  assert.ok(winter < spring, `snow sway ${winter}vw is not below petals ${spring}vw`);
});


test('in winter the alt tiles are snow as well', () => {
  // A petal left on the alt layer would fall among the snow.
  const css = compose({ ...petals, season: 'winter' }, JANUARY, '');
  const alt = /--sakura-petals-near-alt: url\("([^"]*)"\)/.exec(css)[1];
  assert.doesNotMatch(alt, /%23sp/);
  assert.match(alt, /circle/);
});

test('snow is drawn more opaque than petals, and never fully opaque', () => {
  // Small soft flakes at the petal opacity vanish into the ground.
  const read = (css) => Number(/--sakura-petal-opacity: ([\d.]+);/.exec(css)[1]);
  for (const petalDensity of ['sparse', 'gentle', 'heavy']) {
    const spring = read(compose({ ...petals, petalDensity, season: 'spring' }, JANUARY, ''));
    const winter = read(compose({ ...petals, petalDensity, season: 'winter' }, JANUARY, ''));
    assert.ok(winter > spring, `${petalDensity}: snow ${winter} is not above petals ${spring}`);
    assert.ok(winter < 1, `${petalDensity}: snow opacity ${winter} hides what is under it`);
  }
});

test('snow drifts on a calm wind and petals on gusts', () => {
  const spring = compose({ ...petals, season: 'spring' }, JANUARY, '');
  const winter = compose({ ...petals, season: 'winter' }, JANUARY, '');
  assert.match(spring, /--sakura-petal-wind: sakura-sway;/);
  assert.match(winter, /--sakura-petal-wind: sakura-sway-calm;/);
  // Both names have to exist as keyframes, or the sway silently stops.
  for (const name of ['sakura-sway', 'sakura-sway-calm']) {
    assert.match(winter, new RegExp(`@keyframes ${name} \\{`));
  }
});

test('snow falls faster than petals at the same speed setting', () => {
  const read = (css) => Number.parseFloat(/--sakura-petal-duration-near: ([\d.]+)s;/.exec(css)[1]);
  const spring = read(compose({ ...petals, season: 'spring' }, JANUARY, ''));
  const winter = read(compose({ ...petals, season: 'winter' }, JANUARY, ''));
  assert.ok(winter < spring, `snow cycle ${winter}s is not shorter than petals ${spring}s`);
});

test('automatic picks the hemisphere from the time zone', () => {
  for (const zone of ['Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'America/Sao_Paulo',
    'America/Argentina/Buenos_Aires', 'Africa/Johannesburg', 'Asia/Jakarta', 'Antarctica/McMurdo']) {
    assert.equal(hemisphereFromTimeZone(zone), 'southern', zone);
  }
  for (const zone of ['America/New_York', 'Europe/Oslo', 'Asia/Tokyo', 'Africa/Cairo', 'Pacific/Honolulu',
    'America/Bogota', 'Asia/Singapore']) {
    assert.equal(hemisphereFromTimeZone(zone), 'northern', zone);
  }
});

test('an unknown or missing time zone still gets a season', () => {
  assert.equal(hemisphereFromTimeZone(''), 'northern');
  assert.equal(hemisphereFromTimeZone('Not/AZone'), 'northern');
});

test('automatic snows in July in Sydney and January in Oslo', () => {
  assert.equal(isSnowSeason('auto', JULY, 'Australia/Sydney'), true);
  assert.equal(isSnowSeason('auto', JANUARY, 'Australia/Sydney'), false);
  assert.equal(isSnowSeason('auto', JANUARY, 'Europe/Oslo'), true);
  assert.equal(isSnowSeason('auto', JULY, 'Europe/Oslo'), false);
});
