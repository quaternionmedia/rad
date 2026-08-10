/* Shared helpers. Deliberately free of Playwright-specific assertions so the
 * topic registry stays runner-agnostic: a Compose/Roborazzi or XCTest port
 * reimplements this file and reuses tests/topics.mjs as data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PAGE_URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
export const STAGING = path.join(ROOT, 'docs', '.staging');
export const ART = path.join(STAGING, 'artifacts');
export const MEDIA = path.join(STAGING, 'media');

export function ensureStaging() {
  fs.mkdirSync(ART, { recursive: true });
  fs.mkdirSync(MEDIA, { recursive: true });
}

/** Load the page and wait for boot to settle. */
export async function bootPage(page, { closeTour = true, tempo } = {}) {
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => typeof store !== 'undefined' && store.nodes.size > 0);
  await page.waitForTimeout(120);
  if (tempo) await setTempo(page, tempo);
  if (closeTour) {
    await page.click('#tour-close').catch(() => {});
    await page.waitForTimeout(60);
  }
  return page;
}

/** Drive the tempo axes directly. Tests run the tour fast on purpose: the
 *  shipped default is one action per second, and exercising the axis is a
 *  better test than waiting on the default. */
export async function setTempo(page, { bpm = 240, div = 1, aps = 8, linked = false } = {}) {
  await page.evaluate(({ bpm, div, aps, linked }) => {
    setInternalBpm(bpm);
    setDiv(div);
    setLinked(linked);
    if (!linked) setAps(aps);
  }, { bpm, div, aps, linked });
}

/** Centre of a node in screen coordinates. */
export async function nodeCenter(page, id) {
  const b = await page.locator(`[data-node="${id}"]`).boundingBox();
  if (!b) throw new Error(`node "${id}" has no bounding box — is it hidden?`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Multi-step touch. Playwright's touchscreen only taps; a radial menu is
 *  press-drag-release, so the raw CDP channel is the only way to express it. */
export async function touch(page) {
  const cdp = await page.context().newCDPSession(page);
  return {
    start: (x, y) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }),
    end: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
    async move(x, y, steps = 1) {
      for (let i = 0; i < steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
        await page.waitForTimeout(16);
      }
    },
  };
}

/** WCAG 2.x relative luminance and contrast ratio, computed in-page from the
 *  RESOLVED token values so it measures what the browser paints rather than
 *  what the stylesheet says. */
export const CONTRAST_FN = `
  (() => {
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const parse = (s) => {
      s = s.trim();
      const m = s.match(/^#?([0-9a-f]{6})$/i);
      if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
      const r = s.match(/rgba?\\(([^)]+)\\)/i);
      if (r) return r[1].split(/[,\\s/]+/).slice(0, 3).map(Number);
      throw new Error('unparseable colour: ' + s);
    };
    const L = (s) => { const [r, g, b] = parse(s); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
    return { L, ratio: (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); } };
  })()`;

/** Resolve a --rad-* token to its computed value. */
export async function tokenValue(page, name) {
  return page.evaluate((n) =>
    getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim(), name);
}

/** Contrast ratio between two tokens under the active theme. */
export async function tokenContrast(page, fg, bg) {
  return page.evaluate(({ fg, bg, fn }) => {
    const C = eval(fn);
    const v = (n) => getComputedStyle(document.documentElement).getPropertyValue('--rad-' + n).trim();
    return +C.ratio(v(fg), v(bg)).toFixed(2);
  }, { fg, bg, fn: CONTRAST_FN });
}

/** Write one topic's artifact for scripts/build-docs.mjs to consume. */
export function writeArtifact(id, data) {
  ensureStaging();
  fs.writeFileSync(path.join(ART, id + '.json'), JSON.stringify(data, null, 2));
}

/** Read the live meter/config snapshot the README's numbers come from.
 *  It throws rather than returning null: a measurement that could not be taken
 *  must fail the run, not degrade to a dash in generated prose. */
export async function snapshot(page) {
  return page.evaluate(() => ({
    meters: { l0: meters.l0, l1: meters.l1, l2: meters.l2, fx: meters.fx, l3: meters.l3 },
    costs: meters.costs.slice(),
    ttcs: meters.ttcs.slice(),
    jits: meters.jits.slice(),
    chordMap: { ...CHORD_MAP },
    swatchTokens: SWATCH_TOKENS.slice(),
    themes: THEMES.slice(),
    vectorsVersion: VECTORS.version,
    vectorCount: VECTORS.cases.length,
    geometry: { ...GEOM, rCancel: rCancel(), maxItems: MAX_ITEMS },
    tempo: { bpm: clock.bpm, div: tempo.div, aps: tempo.aps, linked: tempo.linked },
    midiCc: { ...MIDI_CC },
    verbs: [...new Set(store.intents.map((i) => i.action))],
    intents: store.intents.map((i) => ({ action: i.action, cost: i.cost, via: i.via, ttc: i.ttc, grid: i.grid })),
  }));
}

export function p95(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(0.95 * (s.length - 1))];
}
