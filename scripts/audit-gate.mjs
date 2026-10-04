#!/usr/bin/env node
/**
 * Fail the build on a high or critical advisory, except the ones written down.
 *
 * `npm audit --audit-level=high` is the right gate until an advisory lands with
 * no fixed version published. Then it fails forever through no fault of this
 * repo, the pressure is to reach for `--force` (which npm answers by
 * downgrading the toolchain years) or to drop the gate, and both leave the
 * project quieter but not safer.
 *
 * So an advisory can be accepted, in writing, in security/audit-exceptions.json.
 * Two rules keep that honest:
 *
 *   an exception that no longer matches a live advisory FAILS, so it cannot
 *   outlive the problem, and a fix landing upstream is what deletes it
 *
 *   an exception past its review date FAILS, so nobody has to remember to come
 *   back to it
 *
 * Anything not written down fails the way it always did.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXCEPTIONS = path.join(ROOT, 'security', 'audit-exceptions.json');
const BLOCKING = new Set(['high', 'critical']);

/**
 * `npm audit --json`, whatever its exit code.
 *
 * It exits non-zero whenever it finds anything, which is the normal case here,
 * so a throw is not a signal. A throw with no stdout is: that means audit
 * itself failed, and a security gate that cannot run must not report success.
 */
function runAudit() {
  let stdout;
  try {
    stdout = execFileSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (error) {
    stdout = error.stdout;
    if (!stdout) {
      throw new Error(`npm audit could not run: ${error.stderr || error.message}`);
    }
  }
  return JSON.parse(stdout);
}

/** The advisories themselves, as opposed to the packages that merely depend on them. */
function rootAdvisories(report) {
  const found = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities || {})) {
    for (const via of vulnerability.via) {
      // A string `via` is "vulnerable because of that other package", not an
      // advisory of its own. Only the objects carry one.
      if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
      const id = (via.url || '').split('/').pop() || `npm-${via.source}`;
      if (!found.has(id)) {
        found.set(id, { id, package: via.name, severity: via.severity, title: via.title, url: via.url, range: via.range });
      }
    }
  }
  return found;
}

function main() {
  const report = runAudit();
  const live = rootAdvisories(report);
  const accepted = JSON.parse(fs.readFileSync(EXCEPTIONS, 'utf8')).exceptions || [];
  const today = new Date().toISOString().slice(0, 10);

  const problems = [];

  for (const [id, advisory] of live) {
    const exception = accepted.find((entry) => entry.id === id);
    if (!exception) {
      problems.push(
        `unaccepted ${advisory.severity} advisory ${id} in ${advisory.package} ${advisory.range}\n` +
          `    ${advisory.title}\n    ${advisory.url}\n` +
          `    Upgrade it, or add it to security/audit-exceptions.json with a reason.`
      );
      continue;
    }
    if (exception.review <= today) {
      problems.push(
        `exception ${id} (${exception.package}) was due for review on ${exception.review}.\n` +
          `    Check whether a fix has shipped, then either upgrade or push the review date out.`
      );
      continue;
    }
    console.log(`accepted  ${id}  ${advisory.package}  until ${exception.review}`);
  }

  for (const exception of accepted) {
    if (!live.has(exception.id)) {
      problems.push(
        `stale exception ${exception.id} (${exception.package}) no longer matches any advisory.\n` +
          `    It is probably fixed. Delete the entry from security/audit-exceptions.json.`
      );
    }
  }

  const counts = report.metadata?.vulnerabilities || {};
  console.log(
    `audit: ${counts.critical || 0} critical, ${counts.high || 0} high, ` +
      `${counts.moderate || 0} moderate, ${counts.low || 0} low`
  );

  if (problems.length) {
    console.error('\nSecurity gate failed:\n');
    for (const problem of problems) console.error(`  - ${problem}\n`);
    process.exit(1);
  }

  console.log('audit gate passed: no unaccepted high or critical advisories');
}

main();
