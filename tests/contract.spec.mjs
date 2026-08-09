/* Contract clauses the vectors cannot reach.
 *
 * The vectors govern the pure core. These assert the clauses that only exist
 * once the core is wired to a renderer and an input adapter — the integration
 * the previous suite left entirely unverified.
 */
import { test, expect } from '@playwright/test';
import { bootPage, nodeCenter } from './lib/harness.mjs';

test.beforeEach(async ({ page }) => { await bootPage(page); });

test('§1 the resolver refuses a ring over the 8-item ceiling', async ({ page }) => {
  const r = await page.evaluate(() => {
    const mk = (n) => ({ items: Array.from({ length: n }, (_, i) => ({ id: 'i' + i, label: 'x' })) });
    const attempt = (n) => { try { createMachine(mk(n)); return 'ok'; } catch (e) { return e.constructor.name; } };
    return { eight: attempt(8), nine: attempt(9), zero: attempt(0) };
  });
  expect(r.eight).toBe('ok');
  expect(r.nine).toBe('RangeError');       // "overflow is a design error, not a scrolling problem"
  expect(r.zero).toBe('RangeError');
});

test('§1 every context the resolver can produce is within the ceiling', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    store.selection.add('qm'); store.selection.add('qmcp');
    const walk = (items, out = []) => { out.push(items.length); items.forEach(i => i.children && walk(i.children, out)); return out; };
    const all = [
      ...walk(resolveMenu({ type: 'node', targetIds: ['qm'], position: { x: 0, y: 0 } }).items),
      ...walk(resolveMenu({ type: 'canvas', targetIds: [], position: { x: 0, y: 0 } }).items),
      ...walk(resolveMenu({ type: 'edge', targetIds: [store.edges[0].id], position: { x: 0, y: 0 } }).items),
      ...walk(resolveMenu({ type: 'selection', targetIds: [...store.selection], position: { x: 0, y: 0 } }).items),
    ];
    store.selection.clear();
    return all;
  });
  expect(Math.max(...sizes)).toBeLessThanOrEqual(8);
  expect(Math.min(...sizes)).toBeGreaterThan(0);
});

test('§1 the menu never mutates the scene — only intents do', async ({ page }) => {
  // The central rule of the contract, and nothing asserted it.
  const r = await page.evaluate(() => {
    const before = JSON.stringify([...store.nodes.values()].map(n => [n.id, n.x, n.y, n.colorToken, n.pinned, n.hidden]));
    const n = store.nodes.get('qm');
    openMenu({ type: 'node', targetIds: ['qm'], position: { x: n.x, y: n.y } }, 200, 400, 'idle');
    feed({ type: 'move', r: 80, thetaDeg: -90 });
    feed({ type: 'key', key: 'ArrowRight' });
    feed({ type: 'move', r: 80, thetaDeg: 90 });
    const during = JSON.stringify([...store.nodes.values()].map(n2 => [n2.id, n2.x, n2.y, n2.colorToken, n2.pinned, n2.hidden]));
    const intents = store.intents.length;
    feed({ type: 'close' });
    return { unchanged: before === during, intents };
  });
  expect(r.unchanged, 'opening and browsing the menu changed the graph').toBe(true);
  expect(r.intents).toBe(0);
});

test('§2 both commit styles agree about every radius', async ({ page }) => {
  // The defect this replaced: at r=200 release-select committed and tap-select
  // cancelled, from identical geometry, because only one style had an outer bound.
  const table = await page.evaluate(() => {
    const spec = () => ({ items: Array.from({ length: 4 }, (_, i) => ({ id: 'i' + i, label: 'i' + i })) });
    const run = (evs) => { const s = createMachine(spec()); for (const e of evs) step(s, e); return s.committed ? s.committed.id : null; };
    const track = (r) => run([{ type: 'down', r: 0, thetaDeg: 0 }, { type: 'longpress' },
                              { type: 'move', r, thetaDeg: 0 }, { type: 'up', r, thetaDeg: 0 }]);
    const idle = (r) => run([{ type: 'open' }, { type: 'down', r, thetaDeg: 0 }, { type: 'up', r, thetaDeg: 0 }]);
    return [10, 30, 37, 60, 108, 130, 145, 147, 200, 900].map((r) => ({ r, track: track(r), idle: idle(r) }));
  });
  for (const row of table) {
    expect(row.track, `radius ${row.r}: release-select and tap-select disagree`).toBe(row.idle);
  }
  // and the band is where the contract says it is
  expect(table.find(r => r.r === 130).track).toBe('i1');    // inside r_cancel = 145.8
  expect(table.find(r => r.r === 147).track).toBe(null);    // outside
  expect(table.find(r => r.r === 900).track).toBe(null);
});

test('§2 the outer bound is derived from r1, not hardcoded', async ({ page }) => {
  const r = await page.evaluate(() => ({ r1: GEOM.r1, scale: GEOM.cancelScale, rc: rCancel() }));
  expect(r.rc).toBeCloseTo(r.r1 * r.scale, 6);
});

test('§3 a latched hub press does not highlight what it cannot commit', async ({ page }) => {
  const r = await page.evaluate(() => {
    const spec = { items: Array.from({ length: 4 }, (_, i) => ({ id: 'i' + i, label: 'i' + i })) };
    const s = createMachine(spec);
    const hl = [];
    for (const ev of [{ type: 'open' }, { type: 'down', r: 10, thetaDeg: 0 },
                      { type: 'move', r: 80, thetaDeg: 0 }, { type: 'move', r: 80, thetaDeg: 90 },
                      { type: 'up', r: 80, thetaDeg: 90 }]) {
      for (const f of step(s, ev)) if (f.t === 'highlight') hl.push(f.i);
    }
    return { hl, committed: s.committed, cancelled: s.cancelled };
  });
  expect(r.hl, 'a hub-latched drag highlighted wedges it could not commit').toEqual([]);
  expect(r.committed).toBe(null);
  expect(r.cancelled).toBe(true);
});

test('§3 highlight effects are self-contained across a ring change', async ({ page }) => {
  // The batch that enters a submenu carries a highlight index into the PARENT
  // ring followed by the submenu effect. A consumer that re-resolves the index
  // reads the wrong ring — and throws outright when the parent index exceeds
  // the child count.
  const r = await page.evaluate(() => {
    const parent = {
      items: [
        { id: 'a', label: 'Alpha' }, { id: 'b', label: 'Bravo' }, { id: 'c', label: 'Charlie' },
        { id: 'd', label: 'Delta', children: [{ id: 'd0', label: 'Deep' }, { id: 'd1', label: 'Deeper' }] },
      ],
    };
    const s = createMachine(parent);
    step(s, { type: 'down', r: 0, thetaDeg: 0 }); step(s, { type: 'longpress' });
    const deg = itemCenterDeg(3, 4);
    const fx = step(s, { type: 'move', r: 125, thetaDeg: deg });
    const hi = fx.find(f => f.t === 'highlight');
    return {
      label: hi?.label, id: hi?.id, index: hi?.i,
      ringAfter: mItems(s).map(i => i.label),
      // what a consumer that re-resolved the index would have read
      naive: mItems(s)[hi?.i]?.label ?? 'THREW',
    };
  });
  expect(r.label, 'the effect must carry the label from the ring it was computed against').toBe('Delta');
  expect(r.id).toBe('d');
  expect(r.ringAfter).toEqual(['Deep', 'Deeper']);
  expect(r.naive, 'index 3 into a 2-item ring is exactly the case that used to throw').toBe('THREW');
});

test('§3 Escape backs out of a submenu before it closes', async ({ page }) => {
  const r = await page.evaluate(() => {
    const n = store.nodes.get('qm');
    openMenu({ type: 'node', targetIds: ['qm'], position: { x: n.x, y: n.y } }, 200, 400, 'idle');
    const colorIdx = mItems(menu.active.machine).findIndex(i => i.children);
    for (let i = 0; i <= colorIdx; i++) feed({ type: 'key', key: 'ArrowRight' });
    feed({ type: 'key', key: 'Enter' });
    const depthInSub = menu.active?.machine.stack.length;
    feed({ type: 'key', key: 'Escape' });
    const depthAfterBack = menu.active?.machine.stack.length;
    feed({ type: 'key', key: 'Escape' });
    return { depthInSub, depthAfterBack, closed: menu.active === null };
  });
  expect(r.depthInSub).toBe(2);
  expect(r.depthAfterBack).toBe(1);
  expect(r.closed).toBe(true);
});

test('§3 Tab is trapped while the menu is open', async ({ page }) => {
  await page.evaluate(() => {
    const n = store.nodes.get('qm');
    openMenu({ type: 'node', targetIds: ['qm'], position: { x: n.x, y: n.y } }, 200, 400, 'idle');
  });
  const before = await page.evaluate(() => document.activeElement?.tagName + '#' + (document.activeElement?.id || ''));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const after = await page.evaluate(() => document.activeElement?.tagName + '#' + (document.activeElement?.id || ''));
  expect(after, 'focus escaped the open menu').toBe(before);
});

test('§3 every wedge is a labelled menuitem in the accessibility tree', async ({ page }) => {
  await page.evaluate(() => {
    const n = store.nodes.get('qm');
    openMenu({ type: 'node', targetIds: ['qm'], position: { x: n.x, y: n.y } }, 200, 400, 'idle');
  });
  const wedges = await page.locator('#menu-layer [role="menuitem"]').all();
  expect(wedges.length).toBeGreaterThan(0);
  for (const w of wedges) {
    const label = await w.getAttribute('aria-label');
    expect(label, 'a wedge reached the a11y tree without a label').toBeTruthy();
  }
  const menuRole = await page.locator('#menu-layer [role="menu"]').count();
  expect(menuRole).toBe(1);
});

test('§2 wedge targets clear the 44-unit floor at the maximum ring size', async ({ page }) => {
  const arc = await page.evaluate(() => {
    // mid-band arc length of one wedge at N=8 — the touch target the geometry
    // clause exists to protect.
    const rMid = (GEOM.r0 + GEOM.r1) / 2;
    return 2 * Math.PI * rMid / 8;
  });
  expect(arc).toBeGreaterThanOrEqual(44);
});

test('a short press never opens the menu', async ({ page }) => {
  const p = await nodeCenter(page, 'qm');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(80);          // well under longPressMs
  await page.mouse.up();
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => menu.active)).toBe(null);
});
