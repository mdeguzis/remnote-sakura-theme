/**
 * Render a page in a real browser and read the result back.
 *
 * Every selector test in this suite proves the CSS says what it is meant to
 * say. None of them can prove what the browser then paints, and that is where
 * this theme actually goes wrong: issue #8 was two rounds of correct looking
 * CSS that stacked the wrong way, and both rounds were settled by a screenshot
 * rather than by reading the file.
 *
 * Browsers are found rather than installed. A missing browser skips locally,
 * where someone may be working on a palette and not care, and fails in CI,
 * where a silently skipped test is the same as not having written it.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Candidates in preference order. Firefox first: its screenshot is reliable headless. */
const BROWSERS = [
  { bin: 'firefox', family: 'firefox' },
  { bin: 'firefox-esr', family: 'firefox' },
  { bin: 'chromium', family: 'chromium' },
  { bin: 'chromium-browser', family: 'chromium' },
  { bin: 'google-chrome-stable', family: 'chromium' },
  { bin: 'google-chrome', family: 'chromium' },
];

/** PATH lookup done directly, so nothing has to go through a shell. */
function which(bin) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, bin);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Not here, or not executable by us. Keep looking.
    }
  }
  return null;
}

let resolved;

/** The browser to render with, or null if there is none. Resolved once. */
export function findBrowser() {
  if (resolved !== undefined) return resolved;
  resolved = null;
  for (const candidate of BROWSERS) {
    const binPath = which(candidate.bin);
    if (binPath) {
      resolved = { ...candidate, path: binPath };
      break;
    }
  }
  return resolved;
}

/**
 * Why the render tests are not running, or null if they are.
 *
 * In CI there is no acceptable reason, so the caller turns this into a failure
 * instead of a skip.
 */
export function skipReason() {
  if (findBrowser()) return null;
  const names = BROWSERS.map((b) => b.bin).join(', ');
  return `no browser found (looked for: ${names})`;
}

/**
 * Render `html` and return the decoded screenshot.
 *
 * Reduced motion is forced on, which our own stylesheet honours by stopping the
 * petal animation. Without it the mask sits wherever the animation happened to
 * be when the shot was taken and no two renders agree.
 */
export function render(html, { width = 1280, height = 900, label = 'render' } = {}) {
  const browser = findBrowser();
  if (!browser) throw new Error(skipReason());

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sakura-render-'));
  const pageFile = path.join(dir, `${label}.html`);
  const shot = path.join(dir, `${label}.png`);
  fs.writeFileSync(pageFile, html);

  try {
    if (browser.family === 'firefox') {
      const profile = path.join(dir, 'profile');
      fs.mkdirSync(profile);
      fs.writeFileSync(path.join(profile, 'user.js'), 'user_pref("ui.prefersReducedMotion", 1);\n');
      execFileSync(
        browser.path,
        ['--headless', '--profile', profile, `--window-size=${width},${height}`, '--screenshot', shot, `file://${pageFile}`],
        { stdio: 'ignore', timeout: 120000 }
      );
    } else {
      execFileSync(
        browser.path,
        [
          '--headless',
          '--no-sandbox',
          '--disable-gpu',
          '--hide-scrollbars',
          '--force-prefers-reduced-motion',
          `--window-size=${width},${height}`,
          `--screenshot=${shot}`,
          `file://${pageFile}`,
        ],
        { stdio: 'ignore', timeout: 120000 }
      );
    }

    if (!fs.existsSync(shot)) {
      throw new Error(`${browser.bin} produced no screenshot for ${label}`);
    }
    return fs.readFileSync(shot);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
