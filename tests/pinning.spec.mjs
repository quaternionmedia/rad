/* Does the vector suite actually constrain the constants it ships?
 *
 * A parallel session found that `cancelScale` did not: changing 1.35 to 1.60
 * failed no vector. A suite that passes while a governed constant moves is not
 * testing that constant, and a port could adopt a different value and claim
 * conformance truthfully.
 *
 * The generalisation is this file. For each constant in the geometry and time
 * blocks, perturb it and require the suite to notice. It is a test about the
 * tests, and it is the cheapest defence against the failure mode this corpus
 * keeps finding in its own tooling: a check that reports success while
 * enforcing nothing.
 *
 * Note on method, because it bit twice. The first audit script computed
 * "detected within ±1%" with `deltas.filter(...).every(d => d.fails > 0)`, and
 * floating point made the filter empty — `[].every()` is `true`, so every
 * constant reported as pinned, including the two that are not. Assertions here
 * are written to fail on an empty set rather than pass on one.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootPage, ROOT } from './lib/harness.mjs';

const VECTORS = JSON.parse(fs.readFileSync(path.join(ROOT, 'conformance', 'vectors.json'), 'utf8'));

/** Constants the core reads, and which block they live in. */
const PINNED = [
  ['GEOM', 'r0'], ['GEOM', 'r1'], ['GEOM', 'cancelScale'], ['GEOM', 'startDeg'],
  ['RING', 'bandMin'], ['RING', 'margin'], ['RING', 'topInset'], ['RING', 'bottomInset'],
  ['TIME', 'chordGapMs'], ['TIME', 'burstSplitMs'], ['TIME', 'ppqn'],
];

/* Unpinnable from core traces, by construction rather than by omission:
 *
 *  - longPressMs — the machine takes an explicit `longpress` event. It is
 *    time-free apart from this constant, which is the contract's own design
 *    decision, so no trace can depend on the threshold.
 *  - slop — lives in the pointer adapter (`gesture.moved`), never in `step()`.
 *    The core cannot see it.
 *
 * The contract carries both as behavioural checklist items instead. That is the
 * same "mechanical / checklist / judgment" split the g0 note proposes, applied
 * honestly rather than by pretending a vector covers them.
 */
const UNPINNABLE = [['GEOM', 'longPressMs'], ['GEOM', 'slop']];

async function perturb(page, block, key, multipliers) {
  return page.evaluate(({ block, key, multipliers, v }) => {
    const obj = { GEOM: window.rad.GEOM, RING: window.rad.RING, TIME: window.rad.TIME }[block];
    const real = obj[key];
    const out = [];
    for (const m of multipliers) {
      obj[key] = +(real * m).toFixed(6);
      out.push({ m, fails: window.rad.runConformanceWith(v).filter((r) => !r.pass).length });
    }
    obj[key] = real;
    return out;
  }, { block, key, multipliers, v: VECTORS });
}

test.beforeEach(async ({ page }) => { await bootPage(page); });

test('the suite passes before anything is perturbed', async ({ page }) => {
  // Without this, every assertion below could be satisfied by a suite that is
  // simply broken, and "perturbing it made something fail" would mean nothing.
  const failing = await page.evaluate((v) =>
    window.rad.runConformanceWith(v).filter((r) => !r.pass).map((r) => r.name), VECTORS);
  expect(failing).toEqual([]);
});

for (const [block, key] of PINNED) {
  test(`${block}.${key} is pinned — a 1% change fails a vector`, async ({ page }) => {
    const results = await perturb(page, block, key, [0.99, 1.01]);
    expect(results.length, 'no perturbation ran, so this test proves nothing').toBe(2);
    const undetected = results.filter((r) => r.fails === 0).map((r) => `x${r.m}`);
    expect(undetected,
      `${block}.${key} can move by 1% with every vector still passing. A port could ` +
      `adopt a different value and claim conformance truthfully.`).toEqual([]);
  });
}

for (const [block, key] of UNPINNABLE) {
  test(`${block}.${key} is knowingly unpinnable, and stays a checklist item`, async ({ page }) => {
    // Asserted in the direction that keeps it honest: if someone finds a way to
    // pin it, this test fails and the constant moves to PINNED with its vector.
    // The failure message is the instruction.
    const results = await perturb(page, block, key, [0.5, 2]);
    const detected = results.filter((r) => r.fails > 0);
    expect(detected,
      `${block}.${key} is now detectable by the vectors. That is an improvement, not a ` +
      `regression: move it to PINNED in this file and delete its checklist row from the ` +
      `contract's Conformance section.`).toEqual([]);
  });
}

test('every constant in the shipped geometry block is accounted for here', async ({ page }) => {
  // The gap this closes: a constant added later is unpinned AND unlisted, so
  // nothing notices it is unpinned. Adding one now fails this test.
  const shipped = await page.evaluate(() => ({
    GEOM: Object.keys(window.rad.GEOM).filter((k) => typeof window.rad.GEOM[k] === 'number'),
    RING: Object.keys(window.rad.RING).filter((k) => typeof window.rad.RING[k] === 'number'),
    TIME: Object.keys(window.rad.TIME).filter((k) => typeof window.rad.TIME[k] === 'number'),
  }));
  const known = new Set([...PINNED, ...UNPINNABLE].map(([b, k]) => `${b}.${k}`));
  const unaccounted = [];
  for (const [block, keys] of Object.entries(shipped)) {
    for (const k of keys) if (!known.has(`${block}.${k}`)) unaccounted.push(`${block}.${k}`);
  }
  expect(unaccounted,
    'a numeric constant is shipped in the core but is neither pinned by a vector nor ' +
    'listed as knowingly unpinnable').toEqual([]);
});

test('the vectors file declares the same constants the core runs', async () => {
  // The other half of the same question: the JSON that ports read must agree
  // with the implementation they are judged against.
  const g = VECTORS.geometry, t = VECTORS.time;
  expect(typeof g.cancelScale).toBe('number');
  expect(typeof g.bandMin).toBe('number');
  expect(typeof t.chordGapMs).toBe('number');
  expect(typeof t.burstSplitMs).toBe('number');
});

test('the declared geometry matches the running geometry', async ({ page }) => {
  const running = await page.evaluate(() => ({
    ...window.rad.GEOM,
    bandMin: window.rad.RING.bandMin, margin: window.rad.RING.margin,
    topInset: window.rad.RING.topInset, bottomInset: window.rad.RING.bottomInset,
    // the file declares this under the geometry block; the core exposes it as a
    // standalone constant, so the names are bridged here rather than in either
    // artifact — a port reads the file and cannot see this JS name.
    maxItems: window.rad.MAX_ITEMS,
  }));
  for (const [k, declared] of Object.entries(VECTORS.geometry)) {
    expect(running[k], `conformance/vectors.json declares ${k}=${declared}, the core runs ${running[k]}`)
      .toBe(declared);
  }
  for (const [k, declared] of Object.entries(VECTORS.time)) {
    const live = await page.evaluate((key) => window.rad.TIME[key], k);
    expect(live, `vectors.json declares time.${k}=${declared}, the core runs ${live}`).toBe(declared);
  }
});
