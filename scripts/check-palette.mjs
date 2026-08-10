/* Palette bench. Runs the same WCAG maths tests/theme.spec.mjs runs, but
 * offline against candidate values, so a palette is tuned before it ships
 * rather than by watching a suite go red. Not wired into CI — the suite is
 * the gate; this is the instrument you design with.
 *
 *   node scripts/check-palette.mjs
 */
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (hex) => { const m = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16)); return 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]); };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/* Role mapping mirrors index.html: components read roles, themes set palette. */
const roles = (p) => ({
  'page-bg': p.bg, 'panel-bg': p.surface, 'wedge-fill': p['surface-2'],
  'wedge-fill-hl': p.accent, 'wedge-label': p.ink, 'wedge-label-hl': p['accent-ink'],
  'wedge-label-danger': p.signal, 'wedge-stroke': p['line-strong'],
  'hub-fill': p.surface, 'hub-label': p['ink-dim'],
  text: p.ink, 'text-dim': p['ink-dim'], accent: p.accent, 'accent-ink': p['accent-ink'],
  ok: p.leaf, danger: p.signal, 'node-label': p.ink,
  'focus-ring': p.accent, 'kfocus-ring': p.leaf, 'node-stroke-selected': p.accent,
  'edge-selected': p.accent,
  'kind-gov': p.accent, 'kind-py': p.royal, 'kind-web': p.calm, 'kind-android': p.leaf, 'kind-new': p.gold,
  'swatch-sky': p.sky, 'swatch-calm': p.calm, 'swatch-royal': p.royal,
  'swatch-gold': p.gold, 'swatch-signal': p.signal,
});

const TEXT = [
  ['wedge-label', 'wedge-fill', 12, false, 'wedge label'],
  ['wedge-label-danger', 'wedge-fill', 12, false, 'DESTRUCTIVE wedge label'],
  ['wedge-label-hl', 'wedge-fill-hl', 12, false, 'highlighted wedge label'],
  ['hub-label', 'hub-fill', 11, false, 'hub label'],
  ['text', 'page-bg', 14, false, 'body text'],
  ['text-dim', 'page-bg', 12.5, false, 'hint text'],
  ['text-dim', 'panel-bg', 11, false, 'HUD / meters'],
  ['text', 'panel-bg', 13, false, 'tour step title'],
  ['text-dim', 'panel-bg', 12, false, 'tour step description'],
  ['accent-ink', 'accent', 13, true, 'skip link'],
  ['ok', 'panel-bg', 13, false, 'passing vectors chip'],
  ['danger', 'panel-bg', 13, false, 'failing vectors chip'],
  ['node-label', 'page-bg', 11.5, false, 'node label'],
];
const UI = [
  ['focus-ring', 'page-bg', 'focus ring'],
  ['kfocus-ring', 'page-bg', 'keyboard focus ring'],
  ['node-stroke-selected', 'page-bg', 'selected node stroke'],
  ['wedge-stroke', 'wedge-fill', 'wedge separator'],
  ['edge-selected', 'page-bg', 'selected edge'],
];
const KINDS = ['kind-gov', 'kind-py', 'kind-web', 'kind-android', 'kind-new'];
const SWATCHES = ['swatch-sky', 'swatch-calm', 'swatch-royal', 'swatch-gold', 'swatch-signal'];

const textMin = (px, bold, theme) => theme === 'contrast' ? 7 : (px >= 18.66 || (bold && px >= 14)) ? 3 : 4.5;
const uiMin = (theme) => theme === 'contrast' ? 4.5 : 3;

export function report(name, palette) {
  const r = roles(palette);
  const rows = [];
  let worst = Infinity, fails = 0;
  for (const [fg, bg, px, bold, label] of TEXT) {
    const v = ratio(r[fg], r[bg]), min = textMin(px, bold, name);
    worst = Math.min(worst, v / min);
    if (v < min) { fails++; rows.push(`  FAIL ${label.padEnd(26)} ${v.toFixed(2)} < ${min}`); }
    else rows.push(`   ok  ${label.padEnd(26)} ${v.toFixed(2)} (min ${min})`);
  }
  for (const [fg, bg, label] of UI) {
    const v = ratio(r[fg], r[bg]), min = uiMin(name);
    if (v < min) { fails++; rows.push(`  FAIL ${label.padEnd(26)} ${v.toFixed(2)} < ${min}`); }
  }
  for (const k of KINDS) {
    const v = ratio(r[k], r['page-bg']), min = uiMin(name);
    if (v < min) { fails++; rows.push(`  FAIL ${k.padEnd(26)} ${v.toFixed(2)} < ${min} on canvas`); }
  }
  for (const s of SWATCHES) {
    const v = ratio(r[s], r['wedge-fill']), min = uiMin(name);
    if (v < min) { fails++; rows.push(`  FAIL ${s.padEnd(26)} ${v.toFixed(2)} < ${min} on wedge`); }
  }
  console.log(`\n=== ${name} === ${fails ? `${fails} FAILING` : 'all pass'}  (tightest text pair at ${(worst * 100).toFixed(0)}% of its floor)`);
  rows.filter((l) => l.startsWith('  FAIL')).forEach((l) => console.log(l));
  if (!fails) rows.forEach((l) => console.log(l));
  return fails;
}

/* ---- the shipped palettes ---- */
export const PALETTES = {
  radical: {
    bg: '#14111f', surface: '#1d1930', 'surface-2': '#262041',
    ink: '#f4eeff', 'ink-dim': '#bdb2d9', line: '#3b3358',
    'line-strong': '#9186c9', 'line-soft': '#241f3c',
    accent: '#5cf0ff', 'accent-ink': '#0a0716',
    signal: '#ff7aa8', leaf: '#6ef2a0', calm: '#4ae3d0',
    royal: '#bd93ff', gold: '#ffc861', sky: '#5cf0ff',
  },
  dark: {
    bg: '#0d0f16', surface: '#161a24', 'surface-2': '#1f2430',
    ink: '#eaeef7', 'ink-dim': '#a3adc2', line: '#2c3342',
    'line-strong': '#7f8ba5', 'line-soft': '#1a1f29',
    accent: '#56d8ff', 'accent-ink': '#06080d',
    signal: '#ff7d94', leaf: '#6ee89a', calm: '#4fd8c4',
    royal: '#b39bff', gold: '#f0c35c', sky: '#56d8ff',
  },
  light: {
    bg: '#f6f4fb', surface: '#ffffff', 'surface-2': '#eae7f4',
    ink: '#16131f', 'ink-dim': '#514a63', line: '#cbc5da',
    'line-strong': '#6b6383', 'line-soft': '#e0dcec',
    accent: '#0060a8', 'accent-ink': '#ffffff',
    signal: '#b01248', leaf: '#12703f', calm: '#0d6b64',
    royal: '#5b34b0', gold: '#74540a', sky: '#0060a8',
  },
  contrast: {
    bg: '#000000', surface: '#000000', 'surface-2': '#000000',
    ink: '#ffffff', 'ink-dim': '#f0f0f0', line: '#ffffff',
    'line-strong': '#ffffff', 'line-soft': '#ffffff',
    accent: '#7df9ff', 'accent-ink': '#000000',
    signal: '#ffa3bd', leaf: '#8dffb0', calm: '#6ff5e4',
    royal: '#d6b8ff', gold: '#ffd977', sky: '#7df9ff',
  },
};

/* Only when run directly: tests/theme.spec.mjs imports PALETTES to assert the
 * stylesheet actually ships these values, and an import that exits the process
 * would take the test runner with it. */
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  let total = 0;
  for (const [name, p] of Object.entries(PALETTES)) total += report(name, p);
  console.log(`\n${total ? total + ' failing pair(s)' : 'every pair passes in every theme'}`);
  process.exit(total ? 1 : 0);
}
