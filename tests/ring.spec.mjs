/* Ring fitting, stale targets, and the paths the first suite never reached.
 *
 * Every assertion here was written against a reproduction. The ring-fitting
 * pair in particular: on a 320x260 viewport the old clamp put the menu centre
 * at y=88 with r1=108 — twenty units above the top of the screen — because its
 * lower bound exceeded its upper bound and it returned the upper one. The
 * contract was silent on the case, so this is a clause and an implementation
 * arriving together.
 */
import { test, expect } from '@playwright/test';
import { bootPage } from './lib/harness.mjs';

const NATURAL_R1 = 108;

test.beforeEach(async ({ page }) => { await bootPage(page); });

test('§2 the ring shrinks toward the band minimum before it overflows', async ({ page }) => {
  const r = await page.evaluate(() => ({
    roomy: fitRing(1280, 860).r1,
    phone: fitRing(390, 900).r1,
    short: fitRing(900, 200).r1,
    tiny: fitRing(60, 60).r1,
    floor: GEOM.r0 + RING.bandMin,
  }));
  expect(r.roomy).toBe(NATURAL_R1);
  expect(r.phone).toBe(NATURAL_R1);
  expect(r.short, 'a short viewport must shrink the ring').toBeLessThan(NATURAL_R1);
  expect(r.short).toBe(r.floor);
  expect(r.tiny, 'never below the band minimum, however small the viewport').toBe(r.floor);
});

test('§2 an axis that cannot hold the ring centres instead of clamping', async ({ page }) => {
  const r = await page.evaluate(() => {
    const vw = 320, vh = 260;
    const { r1 } = fitRing(vw, vh);
    const c = clampRingCentre(10, 10, vw, vh, r1);
    return { r1, c, vh, overflowTop: c.y - r1 };
  });
  expect(r.c.y, 'the axis that cannot fit must be centred').toBe(r.vh / 2);
  // The old behaviour put the ring 20 units off the top. Symmetric overflow is
  // the most that can be promised on a viewport this size, and it is a promise.
  expect(Math.abs(r.overflowTop)).toBeLessThanOrEqual(Math.abs(r.vh / 2 - r.r1));
});

test('§2 the axes are decided independently', async ({ page }) => {
  // 320 wide holds the ring; 260 tall does not. Asserting the mixed result
  // stops a future "just centre everything" simplification.
  const r = await page.evaluate(() => clampRingCentre(10, 10, 320, 260, 92));
  expect(r.x, 'x fits, so it clamps inward').toBe(116);
  expect(r.y, 'y does not fit, so it centres').toBe(130);
});

test('§2 the machine judges the ring it was opened with, not a global', async ({ page }) => {
  const r = await page.evaluate(() => {
    const small = { ...GEOM, ...fitRing(900, 200) };            // r1 = 92 → r_cancel = 124.2
    const spec = { items: Array.from({ length: 4 }, (_, i) => ({ id: 'i' + i, label: 'i' + i })) };
    const run = (geom, radius) => {
      const s = createMachine(spec, geom);
      for (const ev of [{ type: 'open' }, { type: 'down', r: radius, thetaDeg: 0 }, { type: 'up', r: radius, thetaDeg: 0 }]) step(s, ev);
      return s.committed ? s.committed.id : null;
    };
    return {
      smallRc: rCancel(small),
      inSmallBand: run(small, 120),
      beyondSmallBand: run(small, 130),
      sameRadiusAtDefault: run(GEOM, 130),
    };
  });
  expect(r.smallRc).toBeCloseTo(124.2, 6);
  expect(r.inSmallBand, '120 is inside the shrunken band').toBe('i1');
  expect(r.beyondSmallBand, '130 is beyond it and must cancel').toBe(null);
  expect(r.sameRadiusAtDefault, 'the same radius commits at the natural geometry').toBe('i1');
});

test('a menu opened on a small viewport is drawn where it is judged', async ({ page }) => {
  // min(vw,vh)/2 - margin must fall below the natural radius for the fit to
  // engage: 320x300 leaves 142 and changes nothing, which is what the first
  // version of this test asserted against.
  await page.setViewportSize({ width: 320, height: 200 });
  const r = await page.evaluate(() => {
    openMenu({ type: 'canvas', targetIds: [], position: { x: 0, y: 0 } }, 160, 150, 'idle');
    const a = menu.active;
    const painted = document.querySelector('#menu-layer .rm-wedge path').getAttribute('d');
    const out = { geom: a.geom, machineGeom: a.machine.geom, cx: a.cx, cy: a.cy, hasPath: !!painted };
    feed({ type: 'close' });
    return out;
  });
  expect(r.hasPath).toBe(true);
  expect(r.geom.r1, 'the fitted radius must reach the machine').toBe(r.machineGeom.r1);
  expect(r.geom.r1, 'this viewport forces the shrink to the band minimum').toBe(92);
  expect(r.geom.r1).toBeLessThan(NATURAL_R1);
});

test('§1 the resolver survives a target that no longer exists', async ({ page }) => {
  const r = await page.evaluate(() => {
    const attempt = (ctx) => { try { return resolveMenu(ctx).title; } catch (e) { return 'THREW: ' + e.message; } };
    const out = {
      node: attempt({ type: 'node', targetIds: ['gone'], position: { x: 0, y: 0 } }),
      edge: attempt({ type: 'edge', targetIds: ['gone'], position: { x: 0, y: 0 } }),
      selection: attempt({ type: 'selection', targetIds: ['gone', 'also-gone'], position: { x: 0, y: 0 } }),
    };
    try { openMenu({ type: 'node', targetIds: ['gone'], position: { x: 0, y: 0 } }, 400, 350, 'idle'); out.open = 'ok'; feed({ type: 'close' }); }
    catch (e) { out.open = 'THREW: ' + e.message; }
    return out;
  });
  // Throwing inside the resolver took the whole gesture down, with no error a
  // user could see. The canvas menu is the honest fallback.
  for (const [where, title] of Object.entries(r)) {
    expect(title, `${where} threw on a stale target`).not.toMatch(/^THREW/);
  }
  expect(r.node).toBe('canvas');
  expect(r.selection).toBe('canvas');
});

test('a partially stale selection resolves against the nodes that remain', async ({ page }) => {
  const title = await page.evaluate(() =>
    resolveMenu({ type: 'selection', targetIds: ['qm', 'gone', 'qmcp'], position: { x: 0, y: 0 } }).title);
  expect(title, 'the count must describe live nodes, not the raw id list').toBe('2 selected');
});

test('the intent log renders ids as text, never as markup', async ({ page }) => {
  const r = await page.evaluate(() => {
    const id = '<img src=x onerror="window.__pwned=1">';
    store.nodes.set(id, { id, label: id, kind: 'new', colorToken: 'kind-new', x: 10, y: 10, hidden: false, pinned: false, ghost: false });
    applyIntent({ action: 'pin', context: { type: 'node', targetIds: [id], position: { x: 0, y: 0 } }, itemId: null });
    const log = document.getElementById('log');
    return { imgs: log.querySelectorAll('img').length, pwned: !!window.__pwned, text: log.textContent.includes('<img') };
  });
  // Node ids are internal today. add-node mints them and any import makes them
  // data, so the sink is one feature away from being reachable.
  expect(r.imgs, 'an id containing markup produced a real element').toBe(0);
  expect(r.pwned).toBe(false);
  expect(r.text, 'the id should still be visible, as text').toBe(true);
});

test('keyboard focus recovers when the node holding it disappears', async ({ page }) => {
  const r = await page.evaluate(() => {
    focusNode('qm');
    const before = document.activeElement?.getAttribute('data-node');
    applyIntent({ action: 'hide', context: { type: 'node', targetIds: ['qm'], position: { x: 0, y: 0 } }, itemId: null });
    const after = document.activeElement?.getAttribute('data-node');
    return { before, after, focusId: focusNodeId, tag: document.activeElement?.tagName };
  });
  expect(r.before).toBe('qm');
  // Leaving focus on <body> ejects a keyboard user from the graph silently,
  // with focusNodeId still naming a node that is not on the canvas.
  expect(r.tag, 'focus fell out of the graph').not.toBe('BODY');
  expect(r.after, 'focus must move to a node that is still visible').toBeTruthy();
  expect(r.after).not.toBe('qm');
  expect(r.focusId).toBe(r.after);
});

test('edge verbs behave, and the edge ring stays within the ceiling', async ({ page }) => {
  const r = await page.evaluate(() => {
    const e0 = store.edges[0];
    const before = { s: e0.source, t: e0.target, n: store.edges.length };
    const ctx = { type: 'edge', targetIds: [e0.id], position: { x: 0, y: 0 } };
    const items = resolveMenu(ctx).items.length;
    applyIntent({ action: 'reverse', context: ctx, itemId: null });
    const rev = { s: store.edges[0].source, t: store.edges[0].target };
    const labels = [];
    for (let i = 0; i < 4; i++) { applyIntent({ action: 'edit-label', context: ctx, itemId: null }); labels.push(store.edges[0].label); }
    applyIntent({ action: 'delete', context: ctx, itemId: null });
    return { items, reversed: rev.s === before.t && rev.t === before.s, labels, removed: store.edges.length === before.n - 1 };
  });
  expect(r.items).toBeLessThanOrEqual(8);
  expect(r.reversed, 'reverse did not swap the endpoints').toBe(true);
  expect(new Set(r.labels).size, 'edit-label must cycle through distinct labels').toBeGreaterThan(1);
  expect(r.removed, 'delete did not remove the edge').toBe(true);
});
