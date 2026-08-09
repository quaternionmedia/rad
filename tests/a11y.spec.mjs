/* Accessibility, asserted by behaviour.
 *
 * What this replaces: three existence checks — "is there an element with class
 * .skip", "is there something with aria-live", "do nodes have aria-label". All
 * three passed while the skip link did not move focus and three live regions
 * competed during the tour. An assertion that an element exists is not an
 * assertion that it works, and the README claimed the latter.
 */
import { test, expect } from '@playwright/test';
import { bootPage, nodeCenter } from './lib/harness.mjs';

test('the skip link moves focus, not just the scroll position', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  await page.keyboard.press('Tab');                    // the skip link is the first stop
  const focused = await page.evaluate(() => document.activeElement?.className);
  expect(focused).toContain('skip');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  const landed = await page.evaluate(() => document.activeElement?.id);
  expect(landed, 'following the skip link left focus behind').toBe('tour-panel');
});

test('exactly one live region announces', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  const regions = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map(e => e.id || e.className || e.tagName));
  expect(regions, 'competing live regions read over each other').toEqual(['sr-live']);
  const logHidden = await page.evaluate(() => document.getElementById('log').getAttribute('aria-hidden'));
  expect(logHidden, 'the intent log repeats every announcement as a stream').toBe('true');
});

test('the live region announces the wedge under the highlight', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => {
    const n = store.nodes.get('qm');
    openMenu({ type: 'node', targetIds: ['qm'], position: { x: n.x, y: n.y } }, 200, 400, 'idle');
  });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  const first = await page.textContent('#sr-live');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  const second = await page.textContent('#sr-live');
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();
  expect(second, 'the highlight moved but the announcement did not').not.toBe(first);
  // and it must be a real wedge label, not an index resolved against live state
  const labels = await page.evaluate(() => mItems(menu.active.machine).map(i => i.label));
  expect(labels).toContain(second);
});

test('the whole graph is reachable and operable from the keyboard alone', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => focusNode('qm'));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(80);
  const moved = await page.evaluate(() => focusNodeId);
  expect(moved, 'arrow keys did not walk node focus').not.toBe('qm');

  await page.keyboard.press('Enter');                 // open the menu on the focused node
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => !!menu.active)).toBe(true);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const committed = await page.evaluate(() => store.intents.at(-1));
  expect(committed, 'no intent committed on a pointer-free path').toBeTruthy();
  expect(committed.context.type).toBe('node');
});

test('re-rendering does not eject a keyboard user from the graph', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate(() => {
    focusNode('qm');
    const before = document.activeElement?.getAttribute('data-node');
    render();                                          // a drag frame, a theme change, anything
    const after = document.activeElement?.getAttribute('data-node');
    return { before, after };
  });
  expect(r.before).toBe('qm');
  expect(r.after, 'render() dropped keyboard focus to <body>').toBe('qm');
});

test('roving tabindex keeps exactly one node in the tab order', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => focusNode('qm'));
  const counts = await page.evaluate(() => ({
    zero: document.querySelectorAll('.node[tabindex="0"]').length,
    minus: document.querySelectorAll('.node[tabindex="-1"]').length,
  }));
  expect(counts.zero).toBe(1);
  expect(counts.minus).toBeGreaterThan(0);
});

test('touch targets meet the 44px floor on a coarse pointer', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  // The floor is a `@media (pointer: coarse)` rule, so it does not apply to a
  // mouse. Asserting it on the desktop project would be asserting that the
  // media query does not work.
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  test.skip(!coarse, 'fine pointer: the 44px floor is a coarse-pointer rule');
  const small = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button.chip, .step .go, .t-row input[type="range"]')) {
      const b = el.getBoundingClientRect();
      if (b.width && b.height && Math.min(b.width, b.height) < 44) out.push(`${el.id || el.className}: ${Math.round(b.width)}×${Math.round(b.height)}`);
    }
    return out;
  });
  expect(small, 'controls below the 44px touch floor').toEqual([]);
});

test('reduced motion collapses every duration, including the speed axes', async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bootPage(page, { closeTour: false });
  const r = await page.evaluate(() => ({
    reduced: REDUCED,
    travel: beatMs('travel'),
    hold: beatMs('hold'),
    // at 30 bpm / 0.25 aps a beat is 4s; reduced motion must still be 0
    slowest: (() => { setLinked(false); setAps(0.25); return beatMs('travel'); })(),
  }));
  expect(r.reduced).toBe(true);
  expect(r.travel).toBe(0);
  expect(r.hold).toBe(0);
  expect(r.slowest).toBe(0);
});

test('the page has no accessibility-tree regressions in the static shell', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  const problems = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, input, select, a[href]')) {
      const name = el.getAttribute('aria-label') || el.textContent?.trim()
        || document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()
        || el.closest('label')?.textContent?.trim();
      if (!name) out.push(`unnamed ${el.tagName.toLowerCase()}#${el.id || '(no id)'}`);
    }
    if (!document.querySelector('svg#stage[role="application"][aria-label]')) out.push('canvas has no accessible name');
    if (document.documentElement.lang !== 'en') out.push('no document language');
    return out;
  });
  expect(problems).toEqual([]);
});
