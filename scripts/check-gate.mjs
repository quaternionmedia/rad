/* Make version-tags-are-claims §3 and §7 mechanical.
 *
 * §3 says only deterministic automated tests count as validation, and names
 * the three ways a suite stops being deterministic: it retries, it depends on
 * wall-clock timing or ordering, or it skips when a fixture is absent. §7 says
 * CI must fail a release build whose test run reports a skip, a rerun or a
 * retry — "so §3 cannot be satisfied by a suite that merely looks green".
 *
 * A config that sets `retries: 0` is a claim about a file. This reads what the
 * run actually reported and fails on the difference, which is the distinction
 * the record keeps drawing.
 *
 *   node scripts/check-gate.mjs [path/to/results.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] ?? path.join(ROOT, 'test-results', 'results.json');

if (!fs.existsSync(file)) {
  console.error(`check-gate: no run report at ${path.relative(ROOT, file)}.`);
  console.error('The gate cannot vouch for a run it cannot see. Run `npm run gate`.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const counts = { expected: 0, unexpected: 0, skipped: 0, flaky: 0, retried: 0, interrupted: 0 };
const offenders = { skipped: [], flaky: [], retried: [], unexpected: [] };

function walk(suite, trail = []) {
  const here = suite.title ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const name = [...here, spec.title].filter(Boolean).join(' › ');
      const status = t.status ?? 'unknown';           // expected | unexpected | flaky | skipped
      counts[status] = (counts[status] ?? 0) + 1;
      if (status === 'skipped') offenders.skipped.push(name);
      if (status === 'flaky') offenders.flaky.push(name);
      if (status === 'unexpected') offenders.unexpected.push(name);
      // A result carrying more than one attempt is a rerun, whatever it
      // eventually reported.
      if ((t.results?.length ?? 0) > 1) { counts.retried++; offenders.retried.push(name); }
      if ((t.results ?? []).some((r) => r.status === 'interrupted')) counts.interrupted++;
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
}
for (const s of report.suites ?? []) walk(s);

const total = counts.expected + counts.unexpected + counts.flaky + counts.skipped;
console.log(`check-gate: ${total} test(s) — ${counts.expected} passed, ${counts.unexpected} failed, ` +
            `${counts.skipped} skipped, ${counts.flaky} flaky, ${counts.retried} retried`);

const problems = [];
if (!total) problems.push('the run reported no tests at all');
if (counts.unexpected) problems.push(`${counts.unexpected} test(s) failed`);
if (counts.skipped) problems.push(`${counts.skipped} test(s) skipped — §3: an absent test that has announced itself`);
if (counts.flaky) problems.push(`${counts.flaky} test(s) flaky — §3: a suite whose result changes between runs on unchanged input`);
if (counts.retried) problems.push(`${counts.retried} test(s) ran more than once — §7: a rerun disqualifies the run`);
if (counts.interrupted) problems.push(`${counts.interrupted} test(s) interrupted`);

if (problems.length) {
  console.error('\ncheck-gate: this run cannot support a release claim.');
  for (const p of problems) console.error('  - ' + p);
  for (const [kind, names] of Object.entries(offenders)) {
    for (const n of names.slice(0, 10)) console.error(`      ${kind}: ${n}`);
  }
  console.error('\nA tag asserts that automated validation passed AND is deterministic.');
  console.error('Fix the test, or move it out of the gate and into `npm run measure`,');
  console.error('where it is reported as a measurement and claims nothing.');
  process.exit(1);
}

console.log('check-gate: deterministic — no skips, no retries, no flakes. Eligible to support a tag.');
