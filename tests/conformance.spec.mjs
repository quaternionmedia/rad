/* The governed file, not the page's copy of it.
 *
 * conformance/vectors.json is what the contract calls "the executable half"
 * and what ports are judged against. The page ships an inline copy so it runs
 * from file:// with no fetch. Those two had already diverged — the file's
 * traces carry per-event `t` timestamps the inline copy had dropped — and
 * nothing compared them, which made "conformant" unfalsifiable for the one
 * implementation everything else is measured against.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bootPage, ROOT } from './lib/harness.mjs';

const FILE = JSON.parse(fs.readFileSync(path.join(ROOT, 'conformance', 'vectors.json'), 'utf8'));

test('the inline vector block is byte-identical to the governed file', async () => {
  // Deliberately the generator's own --check rather than a reimplementation of
  // it: a second copy of the comparison is a second thing that can drift.
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-vectors.mjs'), '--check'],
    { cwd: ROOT, encoding: 'utf8' });
  expect(out).toContain('in sync');
});

test('the page core passes every case in conformance/vectors.json', async ({ page }) => {
  await bootPage(page);
  const results = await page.evaluate((v) => runConformanceWith(v), FILE);
  const failed = results.filter((r) => !r.pass).map((r) => `${r.name} — ${r.why}`);
  expect(failed, 'vectors failing against the page core').toEqual([]);
  expect(results.length).toBe(FILE.cases.length);
});

test('the vectors would fail if the core were wrong (negative control)', async ({ page }) => {
  // A passing test is not evidence until it has been seen to fail. Break the
  // geometry in-page and confirm the suite notices, so a green conformance run
  // means the vectors are actually being executed.
  await bootPage(page);
  const failed = await page.evaluate((v) => {
    // The functions are script-scoped consts, so they cannot be swapped from
    // outside. GEOM is a const binding to a MUTABLE object, which is the seam
    // the sabotage goes through: move the angle origin and every geometry and
    // trace case must notice.
    const real = GEOM.startDeg;
    GEOM.startDeg = 17;
    const res = runConformanceWith(v).filter((r) => !r.pass).length;
    GEOM.startDeg = real;
    return res;
  }, FILE);
  expect(failed, 'sabotaging angleToIndex must fail vectors').toBeGreaterThan(0);
});

test('the vector set covers every suite type the runner implements', async ({ page }) => {
  await bootPage(page);
  const kinds = new Set();
  for (const c of FILE.cases) {
    for (const k of ['pure', 'trace', 'quant', 'tempo', 'chord', 'split', 'ceiling', 'vocab', 'aps', 'cc', 'ccdiv', 'grid']) {
      if (c[k]) kinds.add(k);
    }
  }
  // Every branch of runConformanceWith must be reachable from the file, or the
  // runner has grown a limb the contract does not exercise.
  expect([...kinds].sort()).toEqual(
    ['aps', 'cc', 'ccdiv', 'ceiling', 'chord', 'grid', 'pure', 'quant', 'split', 'tempo', 'trace', 'vocab']);
});

test('the shipped chord vocabulary is prefix-free', async ({ page }) => {
  // The claim "a known word commits on its last keystroke" is only true while
  // no word prefixes another. Adding `de` beside `del` would silently
  // reintroduce the 250ms wait and quietly worsen every TTC number.
  await bootPage(page);
  const collisions = await page.evaluate(() => prefixCollisions(Object.keys(CHORD_MAP)));
  expect(collisions, 'prefix collisions in CHORD_MAP').toEqual([]);
});

test('every chord verb is also reachable in a menu (menu-as-superset rule)', async ({ page }) => {
  await bootPage(page);
  const unreachable = await page.evaluate(() => {
    const ctxs = [
      { type: 'node', targetIds: ['qm'], position: { x: 0, y: 0 } },
      { type: 'canvas', targetIds: [], position: { x: 0, y: 0 } },
      { type: 'edge', targetIds: [store.edges[0].id], position: { x: 0, y: 0 } },
      { type: 'selection', targetIds: ['qm', 'qmcp'], position: { x: 0, y: 0 } },
    ];
    const reachable = new Set();
    const walk = (items) => items.forEach((i) => { if (i.action) reachable.add(i.action); if (i.children) walk(i.children); });
    store.selection.add('qm'); store.selection.add('qmcp');
    for (const c of ctxs) walk(resolveMenu(c).items);
    store.selection.clear();
    return Object.values(CHORD_MAP).filter((verb) => !reachable.has(verb));
  });
  // Contract §4: the menu is the superset, chords are accelerators. A chord
  // verb with no menu home is the systemization index dropping below 1.
  expect(unreachable, 'chord verbs with no menu path').toEqual([]);
});
