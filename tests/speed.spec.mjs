/* The three speed axes, their MIDI bindings, and the boundary they must not
 * cross (tempo-driven-interaction-speed record).
 */
import { test, expect } from '@playwright/test';
import { bootPage } from './lib/harness.mjs';

test('the shipped default is deliberately slow: 60 bpm, one action per second', async ({ page }) => {
  await page.goto('about:blank');
  await bootPage(page, { closeTour: false });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload();
  await page.waitForFunction(() => typeof clock !== 'undefined' && store.nodes.size > 0);
  const d = await page.evaluate(() => ({
    bpm: clock.bpm, div: tempo.div, aps: tempo.aps, linked: tempo.linked,
    actionPeriod: actionPeriod(), gridPeriod: gridPeriod(),
  }));
  expect(d).toEqual({ bpm: 60, div: 1, aps: 1, linked: true, actionPeriod: 1000, gridPeriod: 1000 });
});

test('linked aps tracks bpm and subdivision', async ({ page }) => {
  await bootPage(page);
  const rows = await page.evaluate(() => {
    setLinked(true);
    const out = [];
    for (const [bpm, div] of [[60, 1], [120, 1], [60, 4], [90, 0.5], [240, 2]]) {
      setInternalBpm(bpm); setDiv(div);
      out.push({ bpm, div, aps: tempo.aps, period: actionPeriod() });
    }
    return out;
  });
  expect(rows[0]).toEqual({ bpm: 60, div: 1, aps: 1, period: 1000 });
  expect(rows[1]).toEqual({ bpm: 120, div: 1, aps: 2, period: 500 });
  expect(rows[2]).toEqual({ bpm: 60, div: 4, aps: 4, period: 250 });
  expect(rows[3].aps).toBeCloseTo(0.75, 6);
  expect(rows[4].aps).toBe(8);
});

test('freeing aps decouples it from the clock, and both stay in range', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate(() => {
    setInternalBpm(60); setDiv(1); setLinked(true);
    setAps(6);                                   // setting aps frees the link
    const freed = { aps: tempo.aps, linked: tempo.linked };
    setInternalBpm(200);                         // clock moves, action rate must not
    const afterClock = { aps: tempo.aps, bpm: clock.bpm };
    setAps(999); const hi = tempo.aps;
    setAps(0);   const lo = tempo.aps;
    setInternalBpm(5000); const bpmHi = clock.bpm;
    setInternalBpm(1);    const bpmLo = clock.bpm;
    setLinked(true);
    return { freed, afterClock, hi, lo, bpmHi, bpmLo, relinked: tempo.aps };
  });
  expect(r.freed).toEqual({ aps: 6, linked: false });
  expect(r.afterClock.aps, 'a freed action rate followed the clock anyway').toBe(6);
  expect(r.hi).toBe(8);
  expect(r.lo).toBe(0.25);
  expect(r.bpmHi).toBe(300);
  expect(r.bpmLo).toBe(30);
  expect(r.relinked, 're-linking must recompute from the CURRENT bpm (30) and div (1)').toBe(0.5);
});

test('MIDI CC drives all three axes without a device', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate(() => {
    setInternalBpm(60); setDiv(1); setLinked(true);
    const t = performance.now();
    onMidiMessage([0xB0, 20, 127], t);           // bpm
    const bpm = clock.bpm;
    onMidiMessage([0xB0, 22, 0], t);             // div → smallest
    const divLo = tempo.div;
    onMidiMessage([0xB0, 22, 127], t);           // div → largest
    const divHi = tempo.div;
    onMidiMessage([0xB0, 21, 64], t);            // aps, frees the link
    const aps = tempo.aps, linked = tempo.linked;
    onMidiMessage([0xB0, 23, 60], t);            // quantize mode
    const q = qmode;
    onMidiMessage([0xB0, 23, 0], t);
    return { bpm, divLo, divHi, aps, linked, q, qOff: qmode };
  });
  expect(r.bpm).toBe(300);
  expect(r.divLo).toBe(0.5);
  expect(r.divHi).toBe(4);
  expect(r.aps).toBeCloseTo(0.25 + (64 / 127) * (8 - 0.25), 6);
  expect(r.linked, 'a CC on the action rate must free the link like the slider does').toBe(false);
  expect(r.q).toBe('beat');
  expect(r.qOff).toBe('off');
});

test('MIDI transport drives tour playback and never mutates the graph', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  await page.evaluate(() => { setLinked(false); setAps(8); });
  const before = await page.evaluate(() => store.intents.length);
  await page.evaluate(() => onMidiMessage([0xFA], performance.now()));   // start
  await page.waitForTimeout(300);
  const playing = await page.evaluate(() => playback.running);
  await page.evaluate(() => onMidiMessage([0xFC], performance.now()));   // stop
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ running: playback.running, intents: store.intents.length }));
  expect(playing, 'MIDI start did not begin playback').toBe(true);
  expect(r.running, 'MIDI stop did not halt playback').toBe(false);
  // stopping leaves committed intents committed — transport controls playback, not state
  expect(r.intents).toBeGreaterThanOrEqual(before);
});

test('MIDI start re-anchors the clock phase', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate(() => {
    clock.phase = 0;
    const t = performance.now();
    onMidiMessage([0xFA], t);
    stopTour();
    return { phase: clock.phase, t, ticks: clock.ticks.length, count: clock.tickCount };
  });
  expect(r.phase).toBeCloseTo(r.t, 3);
  expect(r.ticks).toBe(0);
  expect(r.count).toBe(0);
});

test('the axes never reach the state machine', async ({ page }) => {
  // The refused affordance, asserted: a tempo-dependent long-press would make
  // every conformance vector tempo-dependent too.
  await bootPage(page);
  const r = await page.evaluate(() => {
    const read = () => ({ lp: GEOM.longPressMs, slop: GEOM.slop, gap: TIME.chordGapMs, split: TIME.burstSplitMs, r0: GEOM.r0, r1: GEOM.r1 });
    const base = read();
    setInternalBpm(30); setDiv(0.5); setLinked(false); setAps(0.25);
    const slow = read();
    setInternalBpm(300); setDiv(4); setAps(8);
    const fast = read();
    setInternalBpm(60); setDiv(1); setLinked(true);
    return { base, slow, fast };
  });
  expect(r.slow).toEqual(r.base);
  expect(r.fast).toEqual(r.base);
});

test('scripted durations scale with the action rate', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate(() => {
    setLinked(false);
    setAps(1);   const one = { travel: beatMs('travel'), hold: beatMs('hold'), period: actionPeriod() };
    setAps(4);   const four = { travel: beatMs('travel'), hold: beatMs('hold'), period: actionPeriod() };
    return { one, four };
  });
  expect(r.one.period).toBe(1000);
  expect(r.four.period).toBe(250);
  expect(r.four.travel).toBe(Math.round(r.one.travel / 4));
  expect(r.four.hold).toBe(Math.round(r.one.hold / 4));
  expect(r.one.travel).toBeGreaterThan(0);
});

test('no millisecond literals survive in the demo driver or the tour', async ({ page }) => {
  await bootPage(page);
  const strays = await page.evaluate(() => {
    const out = [];
    const src = [...Object.values(demo).filter(v => typeof v === 'function').map(f => f.toString()),
                 ...TOUR.flatMap(ch => ch.steps.map(s => s.run.toString()))].join('\n');
    // sleep(<number>) is the shape the axes replaced; sleep(expr) is allowed
    // because a real clock dependency is not choreography.
    for (const m of src.matchAll(/sleep\(\s*(\d+)\s*\)/g)) out.push(m[0]);
    return out;
  });
  expect(strays, 'hardcoded pacing that no tempo axis can reach').toEqual([]);
});

test('the speed controls are real, labelled form elements', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  const controls = await page.evaluate(() => ['bpm-range', 'aps-range', 'div-select', 'aps-link'].map((id) => {
    const el = document.getElementById(id);
    const label = document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || el?.closest('label')?.textContent?.trim();
    return { id, tag: el?.tagName, type: el?.type, hasLabel: !!label, min: el?.min, max: el?.max };
  }));
  expect(controls.map(c => c.tag)).toEqual(['INPUT', 'INPUT', 'SELECT', 'INPUT']);
  expect(controls[0].type).toBe('range');
  expect(controls[0].min).toBe('30');
  expect(controls[0].max).toBe('300');
  for (const c of controls) expect(c.hasLabel, `${c.id} has no label`).toBe(true);
});

test('the tempo slider drives the clock from the keyboard', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  await page.evaluate(() => setInternalBpm(60));
  await page.focus('#bpm-range');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => clock.bpm)).toBe(65);
  expect(await page.textContent('#bpm-out')).toBe('65 bpm');
});

test('tempo settings persist across a reload', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => { setInternalBpm(144); setDiv(2); setLinked(false); setAps(3); });
  await page.reload();
  await page.waitForFunction(() => typeof clock !== 'undefined' && store.nodes.size > 0);
  const r = await page.evaluate(() => ({ bpm: clock.bpm, div: tempo.div, aps: tempo.aps, linked: tempo.linked }));
  expect(r).toEqual({ bpm: 144, div: 2, aps: 3, linked: false });
});
