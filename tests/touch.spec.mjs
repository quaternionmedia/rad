/* Assertions that only mean anything on a coarse pointer.
 *
 * These lived in a11y.spec.mjs behind `test.skip(!coarse, …)`, which the
 * version-tags-are-claims record disqualifies from counting as validation:
 * "a skipped test is an absent test that has announced itself — which is
 * better than silence, and is still not evidence."
 *
 * The fix is not to assert a coarse-pointer rule on a mouse. It is to run the
 * test only where it applies, unconditionally. This file is excluded from the
 * desktop project by that project's testMatch, so every test here runs on
 * every invocation that reaches it, and a skip in this suite is a defect.
 */
import { test, expect } from '@playwright/test';
import { bootPage } from './lib/harness.mjs';

test('the pointer really is coarse in this project', async ({ page }) => {
  // Guards the guard: if the project config ever stops emulating touch, the
  // rest of this file would pass vacuously rather than fail.
  await bootPage(page, { closeTour: false });
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  expect(coarse, 'this project must emulate a coarse pointer or its assertions are vacuous').toBe(true);
});

test('every interactive control meets the 44px touch floor', async ({ page }) => {
  await bootPage(page, { closeTour: false });
  const small = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button.chip, .step .go, .t-row input[type="range"], .t-link input')) {
      const b = el.getBoundingClientRect();
      if (b.width && b.height && Math.min(b.width, b.height) < 44) {
        out.push(`${el.id || el.className}: ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
    }
    return out;
  });
  expect(small, 'controls below the 44px touch floor').toEqual([]);
});

test('the wedge target at the maximum ring size clears 44 units', async ({ page }) => {
  await bootPage(page);
  const arc = await page.evaluate(() => 2 * Math.PI * ((GEOM.r0 + GEOM.r1) / 2) / MAX_ITEMS);
  expect(arc, 'mid-band arc length of one wedge at the ring ceiling').toBeGreaterThanOrEqual(44);
});

test('a long-press opens the menu under the finger, not at the pointer', async ({ page }) => {
  await bootPage(page);
  const box = await page.locator('[data-node="qm"]').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [centre] });
  await page.waitForTimeout(450);
  const open = await page.evaluate(() => menu.active && { cx: menu.active.cx, cy: menu.active.cy });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(open, 'long-press did not open the menu').toBeTruthy();
  expect(Math.hypot(open.cx - centre.x, open.cy - centre.y),
    'the menu opened away from the finger').toBeLessThan(GEOM_SLOP_TOLERANCE);
});
const GEOM_SLOP_TOLERANCE = 40;   // clampCenter may shift the ring off a viewport edge
