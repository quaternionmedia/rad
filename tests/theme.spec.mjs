/* Theme tokens and contrast.
 *
 * The measurement that motivated the token layer: the Delete wedge label sat
 * at 4.17:1 on its wedge fill — below the 4.5:1 AA floor for normal text, on
 * the one wedge where misreading is expensive — while the README asserted that
 * contrast rules were "in the stylesheet, not an afterthought". Nothing
 * measured it. This does, in every theme, at the threshold for the rendered
 * size (theme-tokens record §3).
 */
import { test, expect } from '@playwright/test';
import { bootPage, CONTRAST_FN } from './lib/harness.mjs';
import { PALETTES } from '../scripts/check-palette.mjs';

const THEMES = ['radical', 'dark', 'light', 'contrast'];

/* foreground token, background token, rendered px, bold?  */
const TEXT_PAIRS = [
  ['wedge-label',        'wedge-fill',    12,   false, 'wedge label'],
  ['wedge-label-danger', 'wedge-fill',    12,   false, 'DESTRUCTIVE wedge label'],
  ['wedge-label-hl',     'wedge-fill-hl', 12,   false, 'highlighted wedge label'],
  ['hub-label',          'hub-fill',      11,   false, 'hub label'],
  ['text',               'page-bg',       14,   false, 'body text'],
  ['text-dim',           'page-bg',      12.5,  false, 'hint text'],
  ['text-dim',           'panel-bg',      11,   false, 'HUD / meters'],
  ['text',               'panel-bg',      13,   false, 'tour step title'],
  ['text-dim',           'panel-bg',      12,   false, 'tour step description'],
  ['accent-ink',         'accent',        13,   true,  'skip link'],
  ['ok',                 'panel-bg',      13,   false, 'passing vectors chip'],
  ['danger',             'panel-bg',      13,   false, 'failing vectors chip'],
  ['node-label',         'page-bg',      11.5,  false, 'node label'],
];

/* non-text boundaries that carry meaning: WCAG 1.4.11 asks 3:1 */
const UI_PAIRS = [
  ['focus-ring',            'page-bg',   'focus ring'],
  ['kfocus-ring',           'page-bg',   'keyboard focus ring'],
  ['node-stroke-selected',  'page-bg',   'selected node stroke'],
  ['wedge-stroke',          'wedge-fill', 'wedge separator'],
  ['edge-selected',         'page-bg',   'selected edge'],
];

/* AA: 4.5:1 normally, 3:1 for large text (≥18.66px, or ≥14px bold). */
function threshold(px, bold, theme) {
  if (theme === 'contrast') return 7;               // the high-contrast theme claims AAA
  return (px >= 18.66 || (bold && px >= 14)) ? 3 : 4.5;
}

for (const theme of THEMES) {
  test.describe(`theme: ${theme}`, () => {
    test(`text pairs meet contrast in ${theme}`, async ({ page }) => {
      await bootPage(page, { closeTour: false });
      await page.evaluate((t) => setTheme(t), theme);
      const measured = await page.evaluate(({ pairs, fn }) => {
        const C = eval(fn);
        const v = (n) => getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim();
        return pairs.map(([fg, bg, px, bold, label]) => ({ fg, bg, px, bold, label, ratio: +C.ratio(v(fg), v(bg)).toFixed(2) }));
      }, { pairs: TEXT_PAIRS, fn: CONTRAST_FN });

      const failures = measured
        .filter(m => m.ratio < threshold(m.px, m.bold, theme))
        .map(m => `${m.label} (--rad-${m.fg} on --rad-${m.bg}) ${m.ratio}:1 < ${threshold(m.px, m.bold, theme)}:1 at ${m.px}px`);
      expect(failures, `contrast failures in the ${theme} theme`).toEqual([]);
    });

    test(`meaningful non-text boundaries meet 3:1 in ${theme}`, async ({ page }) => {
      await bootPage(page, { closeTour: false });
      await page.evaluate((t) => setTheme(t), theme);
      const measured = await page.evaluate(({ pairs, fn }) => {
        const C = eval(fn);
        const v = (n) => getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim();
        return pairs.map(([fg, bg, label]) => ({ label, fg, bg, ratio: +C.ratio(v(fg), v(bg)).toFixed(2) }));
      }, { pairs: UI_PAIRS, fn: CONTRAST_FN });
      const min = theme === 'contrast' ? 4.5 : 3;
      const failures = measured.filter(m => m.ratio < min)
        .map(m => `${m.label} (--rad-${m.fg} on --rad-${m.bg}) ${m.ratio}:1 < ${min}:1`);
      expect(failures, `non-text contrast failures in the ${theme} theme`).toEqual([]);
    });

    test(`every graph-kind hue is legible in ${theme}`, async ({ page }) => {
      await bootPage(page);
      await page.evaluate((t) => setTheme(t), theme);
      const failures = await page.evaluate(({ fn, min }) => {
        const C = eval(fn);
        const v = (n) => getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim();
        const out = [];
        for (const k of ['kind-gov', 'kind-py', 'kind-web', 'kind-android', 'kind-new']) {
          const r = C.ratio(v(k), v('page-bg'));
          if (r < min) out.push(`${k} ${r.toFixed(2)}:1 on the canvas`);
        }
        for (const s of SWATCH_TOKENS) {
          const r = C.ratio(v('swatch-' + s), v('wedge-fill'));
          if (r < min) out.push(`swatch-${s} ${r.toFixed(2)}:1 on the wedge`);
        }
        return out;
      }, { fn: CONTRAST_FN, min: theme === 'contrast' ? 4.5 : 3 });
      expect(failures).toEqual([]);
    });
  });
}

test('the contrast assertion fails when a palette is broken (negative control)', async ({ page }) => {
  // A passing test is not evidence until it has been seen to fail.
  await bootPage(page);
  const ratio = await page.evaluate((fn) => {
    const C = eval(fn);
    document.documentElement.style.setProperty('--rad-signal', '#1d2026');   // near-invisible on the wedge
    const v = (n) => getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim();
    const r = C.ratio(v('wedge-label-danger'), v('wedge-fill'));
    document.documentElement.style.removeProperty('--rad-signal');
    return r;
  }, CONTRAST_FN);
  expect(ratio).toBeLessThan(4.5);
});

test('no colour literal survives outside the token definitions', async ({ page }) => {
  await bootPage(page);
  const strays = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list) => {
        for (const rule of list) {
          if (rule.cssRules) { walk(rule.cssRules); continue; }
          if (!rule.style) continue;
          const defines = [...rule.style].some(p => p.startsWith('--rad-'));
          if (defines) continue;                       // this IS a token definition
          for (const prop of rule.style) {
            const val = rule.style.getPropertyValue(prop);
            if (/#[0-9a-f]{3,8}\b/i.test(val) || /\brgba?\(\s*\d/i.test(val)) {
              out.push(`${rule.selectorText} { ${prop}: ${val.trim()} }`);
            }
          }
        }
      };
      walk(sheet.cssRules);
    }
    return out;
  });
  expect(strays, 'colour literals outside the token layer').toEqual([]);
});

test('intents carry palette tokens, never colours', async ({ page }) => {
  await bootPage(page);
  const actions = await page.evaluate(() => {
    const walk = (items, out = []) => { items.forEach(i => { if (i.action) out.push(i.action); if (i.children) walk(i.children, out); }); return out; };
    return [...walk(resolveMenu({ type: 'node', targetIds: ['qm'], position: { x: 0, y: 0 } }).items),
            ...Object.values(CHORD_MAP)];
  });
  const literals = actions.filter(a => /#[0-9a-f]{3,8}|rgba?\(/i.test(a));
  expect(literals, 'a colour literal leaked into the portable vocabulary').toEqual([]);
  const colorVerbs = actions.filter(a => a.startsWith('color:'));
  expect(colorVerbs.length).toBeGreaterThan(0);
  const tokens = await page.evaluate(() => SWATCH_TOKENS.slice());
  for (const v of colorVerbs) expect(tokens).toContain(v.slice(6));
});

test('an unknown colour token is refused rather than applied', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate(() => {
    const n = store.nodes.get('qm');
    const before = n.colorToken;
    applyIntent({ action: 'color:#ff0000', context: { type: 'node', targetIds: ['qm'], position: { x: 0, y: 0 } }, itemId: null });
    return { before, after: store.nodes.get('qm').colorToken };
  });
  expect(r.after, 'a hex smuggled into a color: intent was applied').toBe(r.before);
});

test('the theme choice persists and is restored on reload', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => setTheme('contrast'));
  await page.reload();
  await page.waitForFunction(() => typeof store !== 'undefined' && store.nodes.size > 0);
  expect(await page.evaluate(() => currentTheme())).toBe('contrast');
});

test('with no stored choice and a light system preference, light wins', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await bootPage(page);
  await page.evaluate(() => { try { localStorage.removeItem('rad.theme'); } catch {} });
  await page.reload();
  await page.waitForFunction(() => typeof store !== 'undefined');
  expect(await page.evaluate(() => currentTheme())).toBe('light');
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--rad-page-bg').trim());
  expect(bg.toLowerCase()).toBe(PALETTES.light.bg);
});

test('with no stored choice and a dark system preference, radical is the default', async ({ page }) => {
  // The mood is the default, not an opt-in — but a stated light preference is
  // still a preference, and the test above holds it.
  await page.emulateMedia({ colorScheme: 'dark' });
  await bootPage(page);
  await page.evaluate(() => { try { localStorage.removeItem('rad.theme'); } catch {} });
  await page.reload();
  await page.waitForFunction(() => typeof store !== 'undefined');
  expect(await page.evaluate(() => currentTheme())).toBe('radical');
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--rad-page-bg').trim());
  expect(bg.toLowerCase(), 'a soft indigo ground, not black').toBe(PALETTES.radical.bg);
});

test('the stylesheet ships exactly the palettes the bench signed off', async ({ page }) => {
  // scripts/check-palette.mjs is where the palettes are tuned; the stylesheet
  // is where they are painted. Two hand-maintained copies of sixteen hex
  // values is precisely the drift this project already had once, so the
  // agreement is asserted rather than assumed.
  await bootPage(page);
  const shipped = await page.evaluate((themes) => {
    const out = {};
    const keys = ['bg', 'surface', 'surface-2', 'ink', 'ink-dim', 'line', 'line-strong',
      'line-soft', 'accent', 'accent-ink', 'signal', 'leaf', 'calm', 'royal', 'gold', 'sky'];
    for (const th of themes) {
      setTheme(th);
      const cs = getComputedStyle(document.documentElement);
      out[th] = Object.fromEntries(keys.map((k) => [k, cs.getPropertyValue('--rad-' + k).trim().toLowerCase()]));
    }
    setTheme('radical');
    return out;
  }, THEMES);
  for (const th of THEMES) {
    expect(shipped[th], `theme "${th}" drifted from scripts/check-palette.mjs`).toEqual(PALETTES[th]);
  }
});

test('radical keeps a soft ground and one deliberately non-neon hue', async ({ page }) => {
  await bootPage(page);
  const r = await page.evaluate((fn) => {
    const C = eval(fn);
    setTheme('radical');
    const v = (n) => getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim();
    return {
      groundNotBlack: C.L(v('page-bg')) > 0,
      // neon hues sit high on the canvas; amber is the warm counterweight and
      // must still read as clearly warmer than the cyan accent
      accentHue: v('accent'), goldHue: v('gold'),
      panelAboveGround: C.L(v('panel-bg')) > C.L(v('page-bg')),
    };
  }, CONTRAST_FN);
  expect(r.groundNotBlack, 'a soft ground, not #000 — neon needs something to sit on').toBe(true);
  expect(r.panelAboveGround, 'panels must lift off the ground rather than sink into it').toBe(true);
  const [ar, ag, ab] = r.accentHue.replace('#', '').match(/../g).map((h) => parseInt(h, 16));
  const [gr, gg, gb] = r.goldHue.replace('#', '').match(/../g).map((h) => parseInt(h, 16));
  expect(ab, 'the accent is a cool neon').toBeGreaterThan(ar);
  expect(gr, 'gold is the warm contrast to it').toBeGreaterThan(gb);
});
