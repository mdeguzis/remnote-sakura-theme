import fs from 'node:fs';

/**
 * Write a file only when its contents would actually change.
 *
 * Every generator in this project writes into a directory that webpack watches,
 * and webpack runs the generators before each compile. An unconditional write
 * therefore dirties a watched file on every compile and triggers the next one,
 * which is an infinite loop whose only symptom is the machine getting hot. It
 * reached fifteen thousand compiles before anyone noticed.
 *
 * Comparing first breaks that cycle, and it is cheap: these files are tens of
 * kilobytes and the read happens once per compile.
 *
 * @param {string} file
 * @param {string | Buffer} contents
 * @returns {boolean} whether anything was written
 */
export function writeIfChanged(file, contents) {
  const next = Buffer.isBuffer(contents) ? contents : Buffer.from(contents, 'utf8');

  try {
    if (fs.readFileSync(file).equals(next)) return false;
  } catch (err) {
    // A missing file is the normal first-run case. Anything else is real.
    if (err.code !== 'ENOENT') throw err;
  }

  fs.writeFileSync(file, next);
  return true;
}
