/* The meter, held to the metrics record's own definitions.
 *
 * The record's thesis is that "a metric is a record with a meter" — the meter
 * is the evidence, so a meter that measures something other than what the
 * record defines invalidates the argument rather than merely the number.
 */
import { test, expect } from '@playwright/test';
import { bootPage, nodeCenter, touch, p95 } from './lib/harness.mjs';

test.beforeEach(async ({ page }) => {
  await bootPage(page, { tempo: { bpm: 240, div: 1, aps: 8, linked: false } });
});

test('IPA: a press-drag-release envelope costs exactly one input', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  const t = await touch(page);
  await t.start(p.x, p.y);
  await page.waitForTimeout(450);            // long-press opens the menu
  await t.move(p.x + 40, p.y, 4);
  await t.move(p.x + 75, p.y, 6);            // sweep across wedges: many moves, one gesture
  await t.move(p.x + 70, p.y + 8, 4);
  await t.end();
  await page.waitForTimeout(200);
  const it = await page.evaluate(() => store.intents.at(-1));
  expect(it).toBeTruthy();
  expect(it.cost, 'a continuous gesture must cost 1 however long it tracks').toBe(1);
});

test('IPA: every chord verb costs exactly one input', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(100);
  const words = await page.evaluate(() => Object.keys(CHORD_MAP));
  for (const w of words) {
    await page.keyboard.type(w, { delay: 3 });
    await page.waitForTimeout(70);
  }
  const r = await page.evaluate(() => ({
    over: store.intents.filter(i => i.via === 'chord' && i.cost !== 1).map(i => `${i.action}: ${i.cost}`),
    chord: store.intents.filter(i => i.via === 'chord').length,
    typed: store.intents.filter(i => i.via === 'typed').length,
    verbs: new Set(store.intents.filter(i => i.via === 'chord' || i.via === 'typed').map(i => i.action)).size,
  }));
  expect(r.over, 'chord IPA is 1 by construction — a chord is one input').toEqual([]);
  // Every word must resolve to its verb: that part is the product's job.
  expect(r.chord + r.typed, 'a word failed to resolve to a verb').toBe(words.length);
  expect(r.verbs).toBe(words.length);
  // Whether a burst is CLASSIFIED chorded depends on inter-key gaps staying
  // under chordGapMs (30 ms), and CDP keystroke delivery cannot guarantee that
  // under parallel load. The classifier itself is vector-tested; here we only
  // require that the fast path is overwhelmingly the one taken, so a real
  // regression still fails while harness jitter does not.
  expect(r.chord, `only ${r.chord}/${words.length} bursts were delivered machine-fast`)
    .toBeGreaterThanOrEqual(Math.ceil(words.length * 0.75));
});

test('IPA: the tap-select budget of ≤2 holds', async ({ page }) => {
  const e = await page.evaluate(() => {
    const pts = [...store.nodes.values()].map(n => ({ x: n.x * view.k + view.x, y: n.y * view.k + view.y }));
    let best = null, bestD = -1;
    for (let x = 40; x < innerWidth - 40; x += 20) for (let y = 140; y < innerHeight - 160; y += 20) {
      const d = Math.min(...pts.map(p => Math.hypot(p.x - x, p.y - y)));
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    return best;
  });
  await page.mouse.click(e.x, e.y, { button: 'right' });   // input 1: open
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const it = await page.evaluate(() => store.intents.find(i => i.action === 'fit'));
  expect(it).toBeTruthy();
  // keyboard budget: 1 + ceil(N/2) + 1 for an N-item ring
  const n = await page.evaluate(() => resolveMenu({ type: 'canvas', targetIds: [], position: { x: 0, y: 0 } }).items.length);
  expect(it.cost).toBeLessThanOrEqual(1 + Math.ceil(n / 2) + 1);
});

test('IPA: stray typing is refunded, not charged', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(100);
  const before = await page.evaluate(() => meters.inputsSinceIntent);
  await page.keyboard.type('zzqx', { delay: 5 });
  await page.waitForTimeout(400);           // let the burst window close
  const after = await page.evaluate(() => meters.inputsSinceIntent);
  expect(after, 'an unrecognised burst polluted the IPA accumulator').toBe(before);
});

test('every intent carries a cost and a timestamp — including selection', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
  const it = await page.evaluate(() => store.intents.at(-1));
  expect(it.action).toBe('select');
  expect(it.cost, 'a tap is one input').toBe(1);
  expect(it.ttc, 'selection produced no TTC sample, so it was invisible to every latency figure').not.toBeNull();
  expect(typeof it.ttc).toBe('number');
});

test('selection is quantized when Q is on, like any other intent', async ({ page }) => {
  await page.evaluate(() => setQmode('beat'));
  const p = await nodeCenter(page, 'qm');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(400);
  const it = await page.evaluate(() => store.intents.at(-1));
  expect(it.grid, 'selection bypassed the scheduler').toBeTruthy();
  expect(typeof it.grid.deltaMs).toBe('number');
  expect(it.grid.div).toBe(1);
});

test('TTC p95 meets the 16 ms budget over a real sample @timing', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(80);
  const words = await page.evaluate(() => Object.keys(CHORD_MAP));
  for (let i = 0; i < 2; i++) for (const w of words) {
    await page.keyboard.type(w, { delay: 3 });
    await page.waitForTimeout(60);
  }
  const ttcs = await page.evaluate(() => meters.ttcs.slice());
  expect(ttcs.length, 'a percentile needs a sample, not a measurement').toBeGreaterThanOrEqual(20);
  expect(p95(ttcs), `TTC p95 over ${ttcs.length} samples`).toBeLessThanOrEqual(16);
});

test('grid jitter p95 meets the record\'s 1 ms budget, not a looser private one @timing', async ({ page }) => {
  // The gate this replaces asserted 5ms while the record and the README both
  // printed ≤1ms. A silently relaxed budget cannot detect the regression it
  // claims to measure.
  // 250 ms grid, one click every 300 ms. The spacing is the point: the budget
  // is |commit - gridT| for ONE intent per grid point. Several intents
  // quantized to the same instant serialize by construction - the second waits
  // on the first's application - so a tighter cadence measures that queue
  // rather than the scheduler. Measured here: 25 of 30 intents sharing a grid
  // point gave p95 2.8 ms; none sharing gave p95 0.000 ms.
  await page.evaluate(() => { setInternalBpm(240); setDiv(1); setQmode('beat'); });
  const p = await nodeCenter(page, 'qm');
  for (let i = 0; i < 24; i++) { await page.mouse.click(p.x, p.y); await page.waitForTimeout(300); }
  await page.waitForFunction(() => meters.jits.length >= 20, null, { timeout: 30000 });
  const r = await page.evaluate(() => {
    const beats = store.intents.filter(i => i.grid).map(i => i.grid.beat);
    return { jits: meters.jits.slice(), shared: beats.length - new Set(beats).size };
  });
  expect(r.jits.length).toBeGreaterThanOrEqual(20);
  expect(r.shared, 'intents shared a grid point, so this measures the commit queue rather than the scheduler').toBe(0);
  expect(p95(r.jits), `grid jitter p95 over ${r.jits.length} samples`).toBeLessThanOrEqual(1);
});

test('L2 counts transitions, and effects are counted separately', async ({ page }) => {
  const r = await page.evaluate(() => {
    const n = store.nodes.get('qm');
    const l2Before = meters.l2, fxBefore = meters.fx;
    openMenu({ type: 'node', targetIds: ['qm'], position: { x: n.x, y: n.y } }, 200, 400, 'idle');
    // one transition that emits two effects: highlight + submenu
    const colorIdx = mItems(menu.active.machine).findIndex(i => i.children);
    const deg = itemCenterDeg(colorIdx, mItems(menu.active.machine).length);
    menu.active.machine.mode = 'tracking';
    feed({ type: 'move', r: 125, thetaDeg: deg });
    const out = { l2: meters.l2 - l2Before, fx: meters.fx - fxBefore };
    feed({ type: 'close' });
    return out;
  });
  // the transition batch emitted more effects than transitions — which is
  // exactly why conflating them made the ledger's L2 meaningless
  expect(r.fx).toBeGreaterThan(r.l2);
  expect(r.l2).toBeGreaterThan(0);
});

test('continuous navigation is metered at L0/L1 and not charged to IPA', async ({ page }) => {
  await page.mouse.move(200, 400);
  await page.waitForTimeout(80);
  const before = await page.evaluate(() => ({ l0: meters.l0, l1: meters.l1, ipa: meters.inputsSinceIntent, k: view.k }));
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => ({ l0: meters.l0, l1: meters.l1, ipa: meters.inputsSinceIntent, k: view.k }));
  expect(after.k, 'the wheel did not actually zoom').not.toBe(before.k);
  expect(after.l0, 'the wheel was handled but never metered').toBeGreaterThan(before.l0);
  expect(after.l1).toBeGreaterThan(before.l1);
  expect(after.ipa, 'continuous navigation must not be charged to IPA').toBe(before.ipa);
});

test('the abstraction ledger is monotonic and reconciles at L3', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(120);
  await page.keyboard.type('pin', { delay: 4 });
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => ({ ...meters, costs: undefined, ttcs: undefined, jits: undefined }));
  const l3 = await page.evaluate(() => store.intents.length);
  expect(m.l0).toBeGreaterThanOrEqual(m.l1);
  expect(m.l3, 'L3 must equal the intents actually committed').toBe(l3);
});
