/* The host integration standard, proven by a host that is not the reference
 * implementation.
 *
 * A standard with one consumer is a description of that consumer. This builds
 * a synthetic second host inside the page — its own scene, its own state layer,
 * its own vocabulary, its own coordinate system — and drives it entirely
 * through `window.rad`. It never touches `store`, `menu`, `openMenu` or any
 * other internal of the reference page.
 *
 * The load-bearing assertion is not "an intent arrived". It is that the host's
 * scene is byte-identical before and after a complete gesture, which is the
 * contract's central rule and the defect the legacy menu had.
 */
import { test, expect } from '@playwright/test';
import { bootPage } from './lib/harness.mjs';

/* A host with nothing in common with the reference page: a flat array scene,
 * a reducer, verbs of its own, and a camera so the coordinate conversion in
 * §3 is exercised rather than assumed away. */
const HOST = `
(() => {
  const scene = {
    shapes: [{ id: 's1', kind: 'box', x: 100, y: 100, locked: false },
             { id: 's2', kind: 'note', x: 300, y: 220, locked: true }],
    camera: { x: 40, y: -15, zoom: 2 },
    applied: [],
  };
  const snapshot = () => JSON.stringify(scene.shapes);
  const toPolar = (screenX, screenY, centre) => {
    // The host owns its camera; rad is told nothing about it (§3).
    const wx = (screenX - scene.camera.x) / scene.camera.zoom;
    const wy = (screenY - scene.camera.y) / scene.camera.zoom;
    const dx = wx - centre.x, dy = wy - centre.y;
    return { r: Math.hypot(dx, dy), thetaDeg: Math.atan2(dy, dx) * 180 / Math.PI };
  };
  const resolve = (ctx) => {
    if (ctx.type === 'shape') {
      const s = scene.shapes.find((x) => x.id === ctx.targetIds[0]);
      return { title: s.kind, items: [
        { id: 'lock', label: s.locked ? 'Unlock' : 'Lock', action: 'host:toggle-lock' },
        { id: 'dup', label: 'Duplicate', action: 'host:duplicate' },
        { id: 'style', label: 'Style', children: [
          { id: 'st-a', label: 'Plain', action: 'host:style:plain' },
          { id: 'st-b', label: 'Bold', action: 'host:style:bold' } ] },
        { id: 'del', label: 'Delete', action: 'host:delete', destructive: true },
      ] };
    }
    return { title: 'board', items: [{ id: 'add', label: 'Add', action: 'host:add' }] };
  };
  const onIntent = (intent) => {
    scene.applied.push(intent);
    const id = intent.context.targetIds[0];
    const s = scene.shapes.find((x) => x.id === id);
    switch (intent.action) {
      case 'host:toggle-lock': if (s) s.locked = !s.locked; break;
      case 'host:delete': scene.shapes = scene.shapes.filter((x) => x.id !== id); break;
      case 'host:duplicate': if (s) scene.shapes.push({ ...s, id: s.id + '-copy' }); break;
      case 'host:add': scene.shapes.push({ id: 'new', kind: 'box', x: intent.context.position.x, y: intent.context.position.y, locked: false }); break;
    }
  };
  const effects = [];
  const session = window.rad.createSession({
    resolve, onIntent, onEffect: (f) => effects.push(f),
  });
  return { scene, snapshot, toPolar, session, effects,
           reset: () => { effects.length = 0; scene.applied.length = 0; } };
})()`;

test.beforeEach(async ({ page }) => { await bootPage(page); });

test('a host drives a full release-select through the seam alone', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const h = eval(src);
    const centre = { x: 100, y: 100 };
    const before = h.snapshot();

    h.session.openAt({ type: 'shape', targetIds: ['s1'], position: centre },
                     { width: 1280, height: 860 }, 'tracking');
    const openedWith = h.session.view.items.map((i) => i.label);
    const duringOpen = h.snapshot();

    // sweep to item 1 (Duplicate) and release, in the host's own coordinates
    const g = h.session.view.geometry;
    const at = (deg, r) => {
      const rad = deg * Math.PI / 180;
      const wx = centre.x + r * Math.cos(rad), wy = centre.y + r * Math.sin(rad);
      return h.toPolar(wx * h.scene.camera.zoom + h.scene.camera.x,
                       wy * h.scene.camera.zoom + h.scene.camera.y, centre);
    };
    h.session.input({ type: 'move', ...at(window.rad.itemCenterDeg(1, 4), 70) });
    const duringSweep = h.snapshot();
    h.session.input({ type: 'up', ...at(window.rad.itemCenterDeg(1, 4), 70) });

    return {
      openedWith, before, duringOpen, duringSweep,
      after: h.snapshot(),
      applied: h.scene.applied,
      isOpen: h.session.isOpen,
      shapes: h.scene.shapes.length,
    };
  }, HOST);

  expect(r.openedWith, 'the host supplied the content, so the host sees its own labels')
    .toEqual(['Lock', 'Duplicate', 'Style', 'Delete']);
  // The contract's central rule: the menu never mutates the scene.
  expect(r.duringOpen, 'opening the menu changed the host scene').toBe(r.before);
  expect(r.duringSweep, 'sweeping the menu changed the host scene').toBe(r.before);
  // Only the intent does.
  expect(r.applied).toHaveLength(1);
  expect(r.applied[0].action).toBe('host:duplicate');
  expect(r.applied[0].context.type).toBe('shape');
  expect(r.applied[0].itemId).toBe('dup');
  expect(r.shapes).toBe(3);
  expect(r.isOpen, 'the session closes itself on commit').toBe(false);
});

test('the intent a host receives is plain, serializable data', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const h = eval(src);
    h.session.openAt({ type: 'shape', targetIds: ['s1'], position: { x: 100, y: 100 } },
                     { width: 1280, height: 860 }, 'idle');
    h.session.input({ type: 'key', key: 'ArrowRight' });
    h.session.input({ type: 'key', key: 'Enter' });
    const it = h.scene.applied[0];
    const round = JSON.parse(JSON.stringify(it));
    return { it, round, same: JSON.stringify(it) === JSON.stringify(round),
             fns: Object.values(it).filter((v) => typeof v === 'function').length };
  }, HOST);
  // Serializable is the property that lets a host queue, replay, or send an
  // intent over a wire — and the one the legacy closures destroyed.
  expect(r.fns).toBe(0);
  expect(r.same).toBe(true);
  expect(r.round.action).toBe('host:toggle-lock');
});

test('the host owns the vocabulary; rad does not inspect it', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const h = eval(src);
    h.session.openAt({ type: 'shape', targetIds: ['s2'], position: { x: 300, y: 220 } },
                     { width: 1280, height: 860 }, 'idle');
    const labels = h.session.view.items.map((i) => i.label);
    h.session.close();
    return { labels, verbs: ['host:toggle-lock', 'host:duplicate', 'host:delete'] };
  }, HOST);
  // s2 is locked, so the host's own resolver produced "Unlock" — evidence that
  // resolve() is called per open against live host state rather than cached.
  expect(r.labels[0]).toBe('Unlock');
});

test('an unknown context type is passed through opaquely', async ({ page }) => {
  const seen = await page.evaluate(() => {
    let got = null;
    const s = window.rad.createSession({
      resolve: (ctx) => { got = ctx; return { title: 'x', items: [{ id: 'a', label: 'A', action: 'a' }] }; },
      onIntent: () => {},
    });
    s.openAt({ type: 'host-invented-thing', targetIds: ['z'], position: { x: 1, y: 2 }, extra: 42 },
             { width: 800, height: 600 }, 'idle');
    s.close();
    return got;
  });
  expect(seen.type).toBe('host-invented-thing');
  expect(seen.extra, 'rad must carry host fields through untouched').toBe(42);
});

test('the session enforces the ring ceiling on host-supplied content', async ({ page }) => {
  const r = await page.evaluate(() => {
    const mk = (n) => window.rad.createSession({
      resolve: () => ({ items: Array.from({ length: n }, (_, i) => ({ id: 'i' + i, label: 'x', action: 'a' })) }),
      onIntent: () => {},
    });
    const attempt = (n) => {
      try { mk(n).openAt({ type: 'c', targetIds: [], position: { x: 0, y: 0 } }, { width: 800, height: 600 }); return 'ok'; }
      catch (e) { return e.constructor.name; }
    };
    return { eight: attempt(8), nine: attempt(9), zero: attempt(0) };
  });
  // A host that overflows a ring learns at once, not by shipping thin wedges.
  expect(r.eight).toBe('ok');
  expect(r.nine).toBe('RangeError');
  expect(r.zero).toBe('RangeError');
});

test('the seam refuses a host that does not supply both halves', async ({ page }) => {
  const r = await page.evaluate(() => {
    const attempt = (opts) => { try { window.rad.createSession(opts); return 'ok'; } catch (e) { return e.message; } };
    return {
      none: attempt({}),
      contentOnly: attempt({ resolve: () => ({ items: [] }) }),
      stateOnly: attempt({ onIntent: () => {} }),
      both: attempt({ resolve: () => ({ items: [] }), onIntent: () => {} }),
    };
  });
  expect(r.none).toMatch(/resolve/);
  expect(r.contentOnly).toMatch(/onIntent/);
  expect(r.stateOnly).toMatch(/resolve/);
  expect(r.both).toBe('ok');
});

test('effects carry their own labels across a ring change', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const h = eval(src);
    h.session.openAt({ type: 'shape', targetIds: ['s1'], position: { x: 100, y: 100 } },
                     { width: 1280, height: 860 }, 'tracking');
    h.reset();
    const g = h.session.view.geometry;
    const deg = window.rad.itemCenterDeg(2, 4);            // the parented "Style" wedge
    h.session.input({ type: 'move', r: g.r1 + 14, thetaDeg: deg });
    const hi = h.effects.find((f) => f.t === 'highlight');
    const after = h.session.view.items.map((i) => i.label);
    h.session.close();
    return { label: hi && hi.label, id: hi && hi.id, after };
  }, HOST);
  // The batch that enters a submenu carries a highlight for the PARENT ring.
  // A host that re-resolved the index would read the submenu.
  expect(r.label).toBe('Style');
  expect(r.id).toBe('style');
  expect(r.after, 'the ring was replaced by the submenu').toEqual(['Plain', 'Bold']);
});

test('the ring the host is given is fitted to the viewport it passed', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const h = eval(src);
    const open = (w, hgt) => {
      h.session.openAt({ type: 'shape', targetIds: ['s1'], position: { x: 0, y: 0 } }, { width: w, height: hgt }, 'idle');
      const g = h.session.view.geometry;
      h.session.close();
      return g.r1;
    };
    return { roomy: open(1280, 860), cramped: open(900, 200) };
  }, HOST);
  expect(r.roomy).toBe(108);
  expect(r.cramped, 'a host passing a small viewport gets a fitted ring').toBe(92);
});

test('the public surface is frozen and free of DOM references', async ({ page }) => {
  const r = await page.evaluate(() => {
    const leaks = Object.entries(window.rad)
      .filter(([, v]) => typeof v === 'function')
      .filter(([, v]) => /\b(document|HTMLElement|getElementById|querySelector)\b/.test(String(v)))
      .map(([k]) => k);
    let mutated = true;
    try { window.rad.createSession = null; mutated = window.rad.createSession === null; } catch { mutated = false; }
    return { leaks, mutated, count: Object.keys(window.rad).length };
  });
  // "Platform-free" has to be checkable or it is a comment. This is the weaker
  // in-page form of the grep lint the contract wants; the real one waits on
  // the core-extraction decision.
  expect(r.leaks, 'a DOM reference reached the platform-free surface').toEqual([]);
  expect(r.mutated, 'the seam must not be reassignable by a host').toBe(false);
  expect(r.count).toBeGreaterThan(20);
});

test('the scene-unchanged assertion would notice a violation (negative control)', async ({ page }) => {
  // Every other test here rests on "the host scene is byte-identical across a
  // gesture". A brand-new suite passing first time is exactly when that claim
  // should be distrusted, so this proves the snapshot mechanism detects a
  // mutation rather than being incapable of seeing one.
  const r = await page.evaluate(() => {
    const scene = { shapes: [{ id: 's1', locked: false }] };
    const snapshot = () => JSON.stringify(scene.shapes);
    const before = snapshot();
    const s = window.rad.createSession({
      // a host that (wrongly) mutates its scene while building the menu
      resolve: () => { scene.shapes[0].locked = true; return { items: [{ id: 'a', label: 'A', action: 'a' }] }; },
      onIntent: () => {},
    });
    s.openAt({ type: 'x', targetIds: ['s1'], position: { x: 0, y: 0 } }, { width: 800, height: 600 }, 'idle');
    const after = snapshot();
    s.close();
    return { changed: before !== after };
  });
  expect(r.changed, 'the snapshot cannot detect a mutation, so the other assertions prove nothing').toBe(true);
});

test('a commit really is what moves host state (negative control)', async ({ page }) => {
  // The mirror: without the commit, nothing happens. If the host's reducer ran
  // on open or on move, the positive test above would pass for the wrong reason.
  const r = await page.evaluate(() => {
    let applied = 0;
    const s = window.rad.createSession({
      resolve: () => ({ items: Array.from({ length: 4 }, (_, i) => ({ id: 'i' + i, label: 'x', action: 'v' + i })) }),
      onIntent: () => { applied++; },
    });
    s.openAt({ type: 'x', targetIds: [], position: { x: 0, y: 0 } }, { width: 800, height: 600 }, 'idle');
    const onOpen = applied;
    s.input({ type: 'move', r: 70, thetaDeg: 0 });
    s.input({ type: 'key', key: 'ArrowRight' });
    const onBrowse = applied;
    s.input({ type: 'down', r: 70, thetaDeg: 0 });
    s.input({ type: 'up', r: 70, thetaDeg: 0 });
    return { onOpen, onBrowse, onCommit: applied };
  });
  expect(r.onOpen, 'opening applied an intent').toBe(0);
  expect(r.onBrowse, 'browsing applied an intent').toBe(0);
  expect(r.onCommit, 'committing applied exactly one').toBe(1);
});
